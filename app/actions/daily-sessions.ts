'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { dailySessions, months, sessionAttendees } from '../../db/schema';

export interface DailySessionInput {
  id?: string;
  date: string;
  title?: string | null;
  courtName: string;
  courtFee: number;
  courtPayerId: string | null;
  shuttlecockCount: number;
  shuttlecockPricePerItem: number;
  shuttlecockTotalFee: number | null;
  shuttlecockPayerId: string | null;
  drinkFee: number;
  drinkPayerId: string | null;
  otherFee: number;
  otherFeePayerId: string | null;
  note?: string | null;
  attendeeIds: string[];
}

export async function saveDailySession(monthKey: string, input: DailySessionInput) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');
  if (input.attendeeIds.length === 0) throw new Error('Buổi đánh phải có ít nhất một người');

  const { id, attendeeIds, ...fields } = input;

  await db.transaction(async (tx) => {
    let sessionId = id;

    if (sessionId) {
      await tx.update(dailySessions).set(fields).where(eq(dailySessions.id, sessionId));
      await tx.delete(sessionAttendees).where(eq(sessionAttendees.sessionId, sessionId));
    } else {
      const [created] = await tx
        .insert(dailySessions)
        .values({ ...fields, monthId: month.id })
        .returning({ id: dailySessions.id });
      sessionId = created.id;
    }

    await tx
      .insert(sessionAttendees)
      .values(attendeeIds.map((memberId) => ({ sessionId: sessionId!, memberId })));
  });

  revalidatePath(`/${monthKey}`, 'layout');
}

export async function deleteDailySession(monthKey: string, sessionId: string) {
  await db.delete(dailySessions).where(eq(dailySessions.id, sessionId));
  revalidatePath(`/${monthKey}`, 'layout');
}
