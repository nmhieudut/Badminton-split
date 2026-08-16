import { createClient } from '@supabase/supabase-js';

const BUCKET = 'member-qr';
const SIGNED_URL_TTL = 60 * 60; // một giờ

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Chuỗi ảnh không đúng định dạng data URL');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

/** Đuôi tệp suy ra từ kiểu MIME, để Storage trả về đúng content-type khi tải. */
function extensionFor(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

export async function uploadQrFromDataUrl(memberId: string, dataUrl: string): Promise<string> {
  const { buffer, contentType } = dataUrlToBuffer(dataUrl);
  const path = `${memberId}.${extensionFor(contentType)}`;
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

export async function uploadQrFromFile(memberId: string, file: File): Promise<string> {
  const path = `${memberId}.${extensionFor(file.type)}`;
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return path;
}

/**
 * Bucket để riêng tư nên không có URL công khai. Mọi thành viên đều được xem QR
 * của nhau — chủ đích là ai cũng chuyển tiền được cho ai mà không phải đi xin —
 * nên hàm này không kiểm tra quyền theo từng người. Giai đoạn 2 sẽ chèn điều
 * kiện "đã đăng nhập" vào đúng đây.
 */
export async function getQrSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data.signedUrl;
}
