import { describe, expect, it } from 'vitest';
import {
  QR_UPLOAD_TOKEN_DAYS,
  generateQrUploadToken,
  hashQrUploadToken,
  qrUploadExpiry,
} from './qr-upload-token';

describe('qr upload token', () => {
  it('mỗi lần sinh ra một token khác nhau', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateQrUploadToken()));
    expect(seen.size).toBe(50);
  });

  it('token đủ dài để không đoán được', () => {
    // 32 byte -> 43 ký tự base64url
    expect(generateQrUploadToken().length).toBeGreaterThanOrEqual(43);
  });

  it('chỉ chứa ký tự an toàn khi dán vào URL và Zalo', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateQrUploadToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('hash là tất định và không khôi phục được token', () => {
    const t = generateQrUploadToken();
    expect(hashQrUploadToken(t)).toBe(hashQrUploadToken(t));
    expect(hashQrUploadToken(t)).not.toContain(t);
    expect(hashQrUploadToken(t)).toHaveLength(64);
  });

  it('hạn dùng đúng số ngày đã định', () => {
    const now = new Date('2026-08-22T10:00:00Z');
    const exp = qrUploadExpiry(now);
    expect((exp.getTime() - now.getTime()) / 86400000).toBe(QR_UPLOAD_TOKEN_DAYS);
  });
});
