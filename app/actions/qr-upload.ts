'use server';

import { and, eq, gt, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { members, qrUploadTokens } from '../../db/schema';
import { requireAdmin } from '../../lib/auth/session';
import {
  generateQrUploadToken,
  hashQrUploadToken,
  qrUploadExpiry,
} from '../../lib/qr-upload-token';
import { uploadQrFromFile } from '../../lib/storage';

/**
 * Mint a link that lets one member upload their own QR image.
 *
 * Admin only: the link grants write access to that member's QR, so handing
 * one out is an admin act even though using it is not. Any earlier unused
 * link for the same person is revoked, so there is never more than one live.
 */
export async function createQrUploadLink(memberId: string): Promise<string> {
  await requireAdmin();

  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) throw new Error('Không tìm thấy thành viên');

  const token = generateQrUploadToken();

  await db.transaction(async (tx) => {
    await tx
      .delete(qrUploadTokens)
      .where(and(eq(qrUploadTokens.memberId, memberId), isNull(qrUploadTokens.usedAt)));
    await tx.insert(qrUploadTokens).values({
      tokenHash: hashQrUploadToken(token),
      memberId,
      expiresAt: qrUploadExpiry(),
    });
  });

  return token;
}

/**
 * Upload a QR image through a self-service link.
 *
 * DELIBERATE EXEMPTION: this action does NOT call requireAdmin().
 *
 * The whole point of the link is that the member uses it without an account.
 * Authorisation is the token itself: unguessable, bound to one member, expiring,
 * and spent on first use — so the most anyone holding a leaked link can do is
 * replace that one person's QR image once, within the week. This exemption is
 * declared in actions-guard.test.ts.
 */
export async function uploadQrViaLink(token: string, file: File): Promise<void> {
  if (!file || file.size === 0) throw new Error('Chưa chọn ảnh');
  if (!file.type.startsWith('image/')) throw new Error('File phải là ảnh');

  const tokenHash = hashQrUploadToken(token);

  // The token is consumed inside the same transaction as the upload record,
  // so two uploads racing on one link cannot both succeed.
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(qrUploadTokens)
      .where(
        and(
          eq(qrUploadTokens.tokenHash, tokenHash),
          isNull(qrUploadTokens.usedAt),
          gt(qrUploadTokens.expiresAt, new Date())
        )
      )
      .limit(1)
      .for('update');

    if (!row) throw new Error('Link không còn hiệu lực. Nhờ quản lý gửi link mới nhé.');

    const path = await uploadQrFromFile(row.memberId, file);

    await tx.update(members).set({ qrImagePath: path }).where(eq(members.id, row.memberId));
    await tx
      .update(qrUploadTokens)
      .set({ usedAt: new Date() })
      .where(eq(qrUploadTokens.tokenHash, tokenHash));
  });

  revalidatePath('/', 'layout');
}
