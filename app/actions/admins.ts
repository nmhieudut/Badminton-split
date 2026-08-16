'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { admins } from '../../db/schema';
import { getSessionUser, requireSuperAdmin } from '../../lib/auth/session';
import { laEmailAdmin } from '../../lib/auth/admin-emails';

/** Đủ để loại các chuỗi rõ ràng không phải email; không cố bắt mọi trường hợp. */
const DANG_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addAdmin(email: string) {
  await requireSuperAdmin();

  const chuanHoa = email.trim().toLowerCase();
  if (!DANG_EMAIL.test(chuanHoa)) {
    throw new Error('Địa chỉ email không hợp lệ.');
  }

  // Người đã là super admin thì thêm vào bảng cũng vô nghĩa: getVaiTro() luôn
  // trả super_admin trước khi tra bảng. Báo rõ thay vì ghi một dòng vô dụng.
  if (laEmailAdmin(chuanHoa)) {
    throw new Error('Email này đã là super admin từ cấu hình hệ thống.');
  }

  const nguoiThem = await getSessionUser();

  await db
    .insert(admins)
    .values({ email: chuanHoa, addedBy: nguoiThem?.email ?? null })
    .onConflictDoNothing();

  revalidatePath('/', 'layout');
}

export async function removeAdmin(email: string) {
  await requireSuperAdmin();

  await db.delete(admins).where(eq(admins.email, email.trim().toLowerCase()));
  revalidatePath('/', 'layout');
}
