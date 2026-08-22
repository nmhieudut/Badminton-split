import { ROUNDING_THRESHOLD } from './calculate';
import type { Transfer } from './types';

export interface RecordedPayment {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface SettledTransfer extends Transfer {
  /** Total already sent between this pair. */
  paidAmount: number;
  /** What is still outstanding; zero once enough has been sent. */
  remaining: number;
  isSettled: boolean;
}

/**
 * Money sent to somebody the payer no longer owes anything to.
 *
 * It happens when a session is edited in a way that moves the debt somewhere
 * else — the person who fronted the money is changed, or an attendee is taken
 * off the list — after somebody had already paid. The payment is still a real
 * event and stays in the ledger; it simply no longer offsets anything, so it
 * has to be shown rather than quietly dropped.
 */
export interface OrphanPayment extends RecordedPayment {
  fromMemberName: string;
  toMemberName: string;
}

const key = (from: string, to: string) => `${from}::${to}`;

/**
 * Offsets what has been paid against what is currently owed.
 *
 * The debt is recomputed from the sessions on every read, so editing a session
 * — adding shuttles, correcting the court fee — moves the amount owed while
 * the payments stay put. That is the whole point of keeping payments as a
 * ledger: a past transfer stays true, and the difference shows up as what is
 * left to send.
 */
export function applyPayments(
  transfers: Transfer[],
  payments: RecordedPayment[],
  nameOf: (memberId: string) => string
): { transfers: SettledTransfer[]; orphans: OrphanPayment[] } {
  const paidByPair = new Map<string, number>();
  for (const p of payments) {
    const k = key(p.fromMemberId, p.toMemberId);
    paidByPair.set(k, (paidByPair.get(k) ?? 0) + p.amount);
  }

  const matched = new Set<string>();

  const withPayments = transfers.map((t) => {
    const k = key(t.fromMemberId, t.toMemberId);
    matched.add(k);
    const paidAmount = paidByPair.get(k) ?? 0;
    const remaining = Math.max(0, t.amount - paidAmount);
    return { ...t, paidAmount, remaining, isSettled: remaining <= ROUNDING_THRESHOLD };
  });

  const orphans: OrphanPayment[] = [];
  for (const [k, amount] of paidByPair) {
    if (matched.has(k) || amount <= 0) continue;
    const [fromMemberId, toMemberId] = k.split('::');
    orphans.push({
      fromMemberId,
      toMemberId,
      amount,
      fromMemberName: nameOf(fromMemberId),
      toMemberName: nameOf(toMemberId),
    });
  }

  return { transfers: withPayments, orphans };
}
