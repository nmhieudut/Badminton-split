import { createHash, randomBytes } from 'crypto';

/** How long a self-upload link stays valid. */
export const QR_UPLOAD_TOKEN_DAYS = 7;

/**
 * The link is the secret, so the raw token must be unguessable: 32 random
 * bytes, base64url so it survives being pasted into Zalo untouched.
 */
export function generateQrUploadToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Only the hash is stored. A leaked table then yields nothing usable, and
 * comparing hashes keeps the raw token out of the database entirely.
 */
export function hashQrUploadToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function qrUploadExpiry(now = new Date()): Date {
  return new Date(now.getTime() + QR_UPLOAD_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}
