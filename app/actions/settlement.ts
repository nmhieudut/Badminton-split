'use server';

import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { months, payments } from '../../db/schema';
import { requireAdmin } from '../../lib/auth/session';

/**
 * Record money actually sent from one person to another.
 *
 * DELIBERATE EXEMPTION: this action does NOT call requireAdmin().
 *
 * Whoever has just sent the money wants to tick it off right away, and forcing
 * them to sign in with Google merely to press one button is a bigger obstacle
 * than what it would protect. The trade-off: anyone with the link can record a
 * payment, including one that never happened, and we keep no record of who
 * pressed it. That is acceptable because this ledger only helps the group keep
 * track of each other — it is not a receipt — and every entry is visible on the
 * history screen where a wrong one can be spotted and removed.
 *
 * This exemption is declared in actions-guard.test.ts. Do not drop the guard on
 * any other action without declaring it there — the test will go red, and it
 * should.
 *
 * Amounts are kept as their own rows rather than as a paid/not-paid flag on the
 * pair. The flag could not survive the group playing again: the debt grew, the
 * mark did not, and someone who had settled up read as fully paid while being
 * short. What is still owed is now the current debt minus what has been sent,
 * so a later session can never make a past payment untrue.
 */
export async function recordPayment(
  monthKey: string,
  fromMemberId: string,
  toMemberId: string,
  amount: number
) {
  if (fromMemberId === toMemberId) throw new Error('Không thể tự chuyển cho chính mình');

  const value = Math.round(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Số tiền phải lớn hơn 0');

  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  await db.insert(payments).values({
    monthId: month.id,
    fromMemberId,
    toMemberId,
    amount: value,
  });

  revalidatePath(`/${monthKey}`, 'layout');
}

/**
 * Remove the most recent payment between two people — the undo for a tap that
 * should not have happened.
 *
 * Public for the same reason recordPayment is: the person who mistakenly
 * recorded it is usually not an admin, and making them ask someone else to
 * undo a tap is worse than the risk.
 */
export async function undoLastPayment(
  monthKey: string,
  fromMemberId: string,
  toMemberId: string
) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  const [latest] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.monthId, month.id),
        eq(payments.fromMemberId, fromMemberId),
        eq(payments.toMemberId, toMemberId)
      )
    )
    .orderBy(desc(payments.paidAt))
    .limit(1);

  if (!latest) throw new Error('Chưa có lần chuyển nào để hoàn tác');

  await db.delete(payments).where(eq(payments.id, latest.id));
  revalidatePath(`/${monthKey}`, 'layout');
}

/**
 * Delete one specific entry from the history screen.
 *
 * Unlike recording and undoing, this one DOES require an admin. Undoing your
 * own mistaken tap is covered by undoLastPayment; reaching into the ledger and
 * removing an arbitrary entry is a different act, and leaving it open would let
 * anyone with the link quietly erase the record the ledger exists to keep.
 */
export async function deletePayment(monthKey: string, paymentId: string) {
  await requireAdmin();

  await db.delete(payments).where(eq(payments.id, paymentId));
  revalidatePath(`/${monthKey}`, 'layout');
}
