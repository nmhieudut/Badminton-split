import type { SettlementCover, SettlementMember, TransferLine } from './types';

/**
 * Who settles money for whom.
 *
 * A covered member shares one wallet with whoever covers them: everything they
 * owe is sent by the coverer, and everything owed to them is received by the
 * coverer. Shares are still worked out per person — only the debts move — so
 * the per-person rounding is untouched.
 *
 * Covers are a single hop. Chains are rejected when a cover is saved, and a
 * cover for someone outside the period is ignored here.
 */
export function buildWallet(members: SettlementMember[], covers: SettlementCover[] = []) {
  const inPeriod = new Set(members.map((m) => m.id));
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const coverOf = new Map<string, string>();

  for (const c of covers) {
    if (!inPeriod.has(c.memberId) || c.coveredById === c.memberId) continue;
    coverOf.set(c.memberId, c.coveredById);
    // The coverer may not be in this period, so their name comes with the cover.
    if (!nameOf.has(c.coveredById)) nameOf.set(c.coveredById, c.coveredByName);
  }

  const walletOf = (id: string) => coverOf.get(id) ?? id;

  return {
    nameOf: (id: string) => nameOf.get(id) ?? '',
    coveredByNameOf: (id: string) => {
      const cover = coverOf.get(id);
      return cover ? nameOf.get(cover) : undefined;
    },
    walletOf,

    /**
     * Move a debt onto the wallets on both sides, labelling the line with whose
     * share it really was so the coverer can still check it against a session.
     */
    route(debtor: string, creditor: string, line: TransferLine) {
      let label = line.label;
      if (walletOf(debtor) !== debtor) label += ` (phần ${nameOf.get(debtor) ?? ''})`;
      if (walletOf(creditor) !== creditor) label += ` (${nameOf.get(creditor) ?? ''} ứng)`;
      return {
        debtor: walletOf(debtor),
        creditor: walletOf(creditor),
        line: { ...line, label },
      };
    },
  };
}

export type CoverWallet = ReturnType<typeof buildWallet>;
