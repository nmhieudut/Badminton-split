'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { members, monthMembers, months } from '../../db/schema';
import { uploadQrFromFile } from '../../lib/storage';

export interface MemberInput {
  name: string;
  phone?: string | null;
  color?: string | null;
  isPermanent: boolean;
  qrFile?: File | null;
}

export async function createMember(monthKey: string, input: MemberInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Tên thành viên không được để trống');

  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  const [created] = await db
    .insert(members)
    .values({
      name,
      phone: input.phone?.trim() || null,
      color: input.color ?? null,
      isPermanent: input.isPermanent,
    })
    .returning();

  if (input.qrFile && input.qrFile.size > 0) {
    const path = await uploadQrFromFile(created.id, input.qrFile);
    await db.update(members).set({ qrImagePath: path }).where(eq(members.id, created.id));
  }

  await db.insert(monthMembers).values({ monthId: month.id, memberId: created.id });
  revalidatePath(`/${monthKey}`, 'layout');
  return created.id;
}

export async function updateMember(monthKey: string, memberId: string, input: MemberInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Tên thành viên không được để trống');

  const patch: Record<string, unknown> = {
    name,
    phone: input.phone?.trim() || null,
    color: input.color ?? null,
    isPermanent: input.isPermanent,
  };

  if (input.qrFile && input.qrFile.size > 0) {
    patch.qrImagePath = await uploadQrFromFile(memberId, input.qrFile);
  }

  await db.update(members).set(patch).where(eq(members.id, memberId));
  revalidatePath(`/${monthKey}`, 'layout');
}

/**
 * Chỉ gỡ khỏi tháng đang xem. Bản ghi thành viên và lịch sử ở các tháng khác
 * giữ nguyên — xóa hẳn một người sẽ kéo theo mọi buổi đánh họ từng tham gia,
 * làm sai số tiền của những tháng đã chốt.
 */
export async function removeMemberFromMonth(monthKey: string, memberId: string) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  await db
    .delete(monthMembers)
    .where(and(eq(monthMembers.monthId, month.id), eq(monthMembers.memberId, memberId)));

  revalidatePath(`/${monthKey}`, 'layout');
}

/** Thêm một người đã có sẵn vào tháng đang xem. */
export async function addExistingMemberToMonth(monthKey: string, memberId: string) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  await db
    .insert(monthMembers)
    .values({ monthId: month.id, memberId })
    .onConflictDoNothing();

  revalidatePath(`/${monthKey}`, 'layout');
}
