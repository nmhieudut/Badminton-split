'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { coverMapOfMonth } from '../../db/cover-queries';
import { members, monthMembers, months } from '../../db/schema';
import { requireAdmin } from '../../lib/auth/session';
import { validateCover } from '../../lib/settlement/validate-cover';

/**
 * Set, change or clear who pays and receives on a member's behalf in one
 * period. The coverer can be anyone on the roster, in the period or not.
 */
export async function setMemberCover(
  monthKey: string,
  memberId: string,
  coveredById: string | null
) {
  await requireAdmin();

  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  await db.transaction(async (tx) => {
    // Serialise cover edits within one period, so two admins saving at once
    // cannot each pass the single-hop check and together form a chain.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${month.id}))`);

    const [inPeriod] = await tx
      .select({ memberId: monthMembers.memberId })
      .from(monthMembers)
      .where(and(eq(monthMembers.monthId, month.id), eq(monthMembers.memberId, memberId)))
      .limit(1);
    if (!inPeriod) throw new Error('Thành viên không có trong kỳ này');

    if (coveredById) {
      const [coverer] = await tx
        .select({ id: members.id })
        .from(members)
        .where(eq(members.id, coveredById))
        .limit(1);
      if (!coverer) throw new Error('Người trả giúp không tồn tại');
    }

    const error = validateCover(await coverMapOfMonth(tx, month.id), memberId, coveredById);
    if (error) throw new Error(error);

    await tx
      .update(monthMembers)
      .set({ coveredById })
      .where(and(eq(monthMembers.monthId, month.id), eq(monthMembers.memberId, memberId)));
  });

  revalidatePath(`/${monthKey}`, 'layout');
}
