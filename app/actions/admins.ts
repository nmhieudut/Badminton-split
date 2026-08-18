'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { admins } from '../../db/schema';
import { getSessionUser, requireSuperAdmin } from '../../lib/auth/session';
import { isSuperAdminEmail } from '../../lib/auth/admin-emails';

/** Enough to reject strings that clearly aren't emails; not meant to catch every case. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addAdmin(email: string) {
  await requireSuperAdmin();

  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error('Địa chỉ email không hợp lệ.');
  }

  // Adding someone who is already a super admin to the table is pointless:
  // getRole() returns super_admin before it ever looks at the table. Say so
  // clearly instead of writing a useless row.
  if (isSuperAdminEmail(normalized)) {
    throw new Error('Email này đã là super admin từ cấu hình hệ thống.');
  }

  const addedByUser = await getSessionUser();

  await db
    .insert(admins)
    .values({ email: normalized, addedBy: addedByUser?.email ?? null })
    .onConflictDoNothing();

  revalidatePath('/', 'layout');
}

export async function removeAdmin(email: string) {
  await requireSuperAdmin();

  await db.delete(admins).where(eq(admins.email, email.trim().toLowerCase()));
  revalidatePath('/', 'layout');
}
