'use server';

import type { Route } from 'next';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../../db';
import { requireAdmin } from '../../lib/auth/session';
import { members, monthMembers, months } from '../../db/schema';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function createMonth(monthKey: string, carryOverPermanent = true) {
  await requireAdmin();

  if (!MONTH_KEY.test(monthKey)) throw new Error('Mã tháng không hợp lệ');

  const [existing] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (existing) redirect(`/${monthKey}` as Route);

  const [y, m] = monthKey.split('-');

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(months)
      .values({ monthKey, title: `Tháng ${m}/${y}`, note: `Kỳ Tháng ${m}/${y}` })
      .returning();

    if (carryOverPermanent) {
      const permanent = await tx
        .select({ id: members.id })
        .from(members)
        .where(eq(members.isPermanent, true));
      if (permanent.length) {
        await tx
          .insert(monthMembers)
          .values(permanent.map((p) => ({ monthId: created.id, memberId: p.id })));
      }
    }
  });

  revalidatePath('/', 'layout');
  redirect(`/${monthKey}` as Route);
}

export async function updateMonth(
  monthId: string,
  fields: { title?: string; note?: string | null; initialFund?: number }
) {
  await requireAdmin();

  await db.update(months).set(fields).where(eq(months.id, monthId));
  revalidatePath('/', 'layout');
}

export async function deleteMonth(monthId: string) {
  await requireAdmin();

  await db.delete(months).where(eq(months.id, monthId));
  revalidatePath('/', 'layout');
  redirect('/');
}
