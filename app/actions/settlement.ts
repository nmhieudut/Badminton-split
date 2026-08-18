'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { months, settledTransfers } from '../../db/schema';

/**
 * Mark a transfer as paid, or unmark it.
 *
 * DELIBERATE EXEMPTION: this action does NOT call requireAdmin().
 *
 * Whoever has just sent the money wants to tick it off right away, and forcing
 * them to sign in with Google merely to press one button is a bigger obstacle
 * than what it would protect. The trade-off: anyone with the link can mark a
 * transfer, including someone who has not paid, and we keep no record of who
 * pressed it. That is acceptable because this mark only helps the group keep
 * track of each other — it is not a receipt — and a mistaken tap is undone by
 * tapping again.
 *
 * This exemption is declared in actions-guard.test.ts. Do not drop the guard on
 * any other action without declaring it there — the test will go red, and it
 * should.
 *
 * The key is the pair of people, without the amount. An earlier version keyed on
 * "{debtor}-{payee}-{amount}", so adding a single session changed the amount,
 * which changed the key, and the paid mark silently vanished.
 */
export async function toggleTransferSettled(
  monthKey: string,
  fromMemberId: string,
  toMemberId: string
) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  const where = and(
    eq(settledTransfers.monthId, month.id),
    eq(settledTransfers.fromMemberId, fromMemberId),
    eq(settledTransfers.toMemberId, toMemberId)
  );

  const [existing] = await db.select().from(settledTransfers).where(where).limit(1);

  if (existing) {
    await db.delete(settledTransfers).where(where);
  } else {
    await db.insert(settledTransfers).values({
      monthId: month.id,
      fromMemberId,
      toMemberId,
    });
  }

  revalidatePath(`/${monthKey}`, 'layout');
}
