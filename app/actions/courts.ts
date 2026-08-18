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
 * Edit a court's name or fee.
 *
 * Safe for existing data: a session snapshots the court name and fee when it is
 * saved instead of pointing at this table, so changing the fee here does not
 * alter the amounts of periods that are already settled.
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
 * Enable or disable a court.
 *
 * Disable rather than delete: a disabled court disappears from the dropdown but
 * the sessions ever played there stay intact, and it can be re-enabled at any
 * time.
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
