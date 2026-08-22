import { formatVND } from '../money';
import type { TransferLine } from './types';

/** The slice of a transfer a reminder needs. Kept narrow so it is easy to build in tests. */
export interface ReminderInput {
  fromMemberName: string;
  toMemberName: string;
  /** What is still outstanding — not the original amount. */
  remaining: number;
  /** Already sent, if any, so the message can acknowledge it. */
  paidAmount: number;
  lines: TransferLine[];
  /** Where the recipient's QR can be seen, if they have one. */
  qrPageUrl?: string;
}

const shortDate = (iso: string) => iso.split('-').slice(1).reverse().join('/');

/**
 * A private nudge for one person, as opposed to the group report.
 *
 * It says only what concerns them — which evenings, how much is left, to
 * whom — so it reads as a reminder rather than a public ledger, and it names
 * the sessions because a number on its own is exactly what people could not
 * check before.
 */
export function buildReminder(t: ReminderInput): string {
  const out: string[] = [];

  out.push(`${t.fromMemberName} ơi, tiền cầu lông còn ${formatVND(t.remaining)} gửi ${t.toMemberName} nhé.`);

  // Only the lines that run in the debtor's direction; offsets are noise here.
  const owed = t.lines.filter((l) => l.amount > 0);
  if (owed.length > 0) {
    out.push('Gồm:');
    for (const l of owed) out.push(`• ${shortDate(l.date)} ${l.label}: ${formatVND(l.amount)}`);
  }

  if (t.paidAmount > 0) {
    out.push(`(Đã nhận ${formatVND(t.paidAmount)} rồi, còn lại ${formatVND(t.remaining)}.)`);
  }

  if (t.qrPageUrl) out.push(`Mã QR của ${t.toMemberName}: ${t.qrPageUrl}`);

  return out.join('\n');
}

/** Several reminders in one paste, separated so each still reads as its own message. */
export function buildReminders(items: ReminderInput[]): string {
  return items.map(buildReminder).join('\n\n———\n\n');
}
