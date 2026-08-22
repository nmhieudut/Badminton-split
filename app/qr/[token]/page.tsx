import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../../db';
import { members, qrUploadTokens } from '../../../db/schema';
import { hashQrUploadToken } from '../../../lib/qr-upload-token';
import { getQrSignedUrl } from '../../../lib/storage';
import { QrSelfUpload } from '../../../components/QrSelfUpload';

/*
 * The landing page of a self-upload link. Deliberately outside the month
 * layout: the person opening it may never have seen the app, and the only
 * thing they need is to pick an image.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [row] = await db
    .select({
      memberId: qrUploadTokens.memberId,
      name: members.name,
      qrImagePath: members.qrImagePath,
    })
    .from(qrUploadTokens)
    .innerJoin(members, eq(members.id, qrUploadTokens.memberId))
    .where(
      and(
        eq(qrUploadTokens.tokenHash, hashQrUploadToken(token)),
        isNull(qrUploadTokens.usedAt),
        gt(qrUploadTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!row) return <QrSelfUpload token={token} state="invalid" />;

  const currentQrUrl = await getQrSignedUrl(row.qrImagePath);
  return <QrSelfUpload token={token} state="ready" name={row.name} currentQrUrl={currentQrUrl} />;
}
