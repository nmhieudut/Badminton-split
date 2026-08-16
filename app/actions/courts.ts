'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { courts } from '../../db/schema';
import { requireAdmin } from '../../lib/auth/session';

export interface CourtInput {
  name: string;
  defaultFee: number;
}

export async function createCourt(input: CourtInput) {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) throw new Error('Tên sân không được để trống');
  if (input.defaultFee < 0) throw new Error('Giá sân không được âm');

  await db
    .insert(courts)
    .values({ name, defaultFee: Math.round(input.defaultFee) })
    .onConflictDoNothing();

  revalidatePath('/', 'layout');
}

/**
 * Sửa tên hoặc giá của một sân.
 *
 * An toàn với dữ liệu cũ: buổi đánh chép lại tên và giá lúc ghi, không trỏ tới
 * bảng này, nên đổi giá ở đây không làm sai số tiền của những kỳ đã chốt.
 */
export async function updateCourt(courtId: string, input: CourtInput) {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) throw new Error('Tên sân không được để trống');
  if (input.defaultFee < 0) throw new Error('Giá sân không được âm');

  await db
    .update(courts)
    .set({ name, defaultFee: Math.round(input.defaultFee) })
    .where(eq(courts.id, courtId));

  revalidatePath('/', 'layout');
}

/**
 * Bật hoặc tắt một sân.
 *
 * Tắt chứ không xóa: sân đã tắt biến khỏi dropdown nhưng những buổi từng đánh
 * ở đó vẫn nguyên vẹn, và bật lại được bất cứ lúc nào.
 */
export async function toggleCourtActive(courtId: string, isActive: boolean) {
  await requireAdmin();

  await db.update(courts).set({ isActive }).where(eq(courts.id, courtId));
  revalidatePath('/', 'layout');
}

export async function deleteCourt(courtId: string) {
  await requireAdmin();

  await db.delete(courts).where(eq(courts.id, courtId));
  revalidatePath('/', 'layout');
}
