'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { requireAdmin } from '../../lib/auth/session';
import {
  dailySessions,
  members,
  monthMembers,
  months,
  sessionAttendees,
} from '../../db/schema';
import { uploadQrFromFile } from '../../lib/storage';

export interface MemberInput {
  name: string;
  phone?: string | null;
  color?: string | null;
  isPermanent: boolean;
  qrFile?: File | null;
}

export async function createMember(monthKey: string, input: MemberInput) {
  await requireAdmin();

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
  await requireAdmin();

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
 * Only unlinks the member from the month being viewed. The member record and
 * their history in other months are left untouched — deleting a person outright
 * would drag along every session they ever attended, corrupting the amounts of
 * months that are already settled.
 */
export async function removeMemberFromMonth(monthKey: string, memberId: string) {
  await requireAdmin();

  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  await db.transaction(async (tx) => {
    await tx
      .delete(monthMembers)
      .where(and(eq(monthMembers.monthId, month.id), eq(monthMembers.memberId, memberId)));

    // Also drop this person's attendance rows for the sessions OF THIS PERIOD.
    // If they were left behind, those sessions would still count them among the
    // people the cost is split between even though they no longer belong to the
    // period. Other periods are not touched.
    const sessionIds = (
      await tx
        .select({ id: dailySessions.id })
        .from(dailySessions)
        .where(eq(dailySessions.monthId, month.id))
    ).map((r) => r.id);

    if (sessionIds.length) {
      await tx
        .delete(sessionAttendees)
        .where(
          and(
            inArray(sessionAttendees.sessionId, sessionIds),
            eq(sessionAttendees.memberId, memberId)
          )
        );
    }

  });

  revalidatePath(`/${monthKey}`, 'layout');
}

/**
 * Tick people from the shared roster into the period being viewed.
 *
 * This is the normal way to fill a new period: a person is created once and
 * reused, so their QR image and phone number follow them instead of having to
 * be entered again every period.
 */
export async function addExistingMembersToMonth(monthKey: string, memberIds: string[]) {
  await requireAdmin();

  const ids = [...new Set(memberIds)];
  if (ids.length === 0) throw new Error('Chưa chọn ai để thêm');

  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  // Reject ids that do not name a real person, rather than letting a foreign id
  // reach the join table where it would show up as a member nobody can identify.
  const known = await db.select({ id: members.id }).from(members).where(inArray(members.id, ids));
  if (known.length !== ids.length) throw new Error('Có thành viên không tồn tại');

  await db
    .insert(monthMembers)
    .values(ids.map((memberId) => ({ monthId: month.id, memberId })))
    .onConflictDoNothing();

  revalidatePath(`/${monthKey}`, 'layout');
}
