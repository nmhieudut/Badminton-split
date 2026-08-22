import { createClient } from '@supabase/supabase-js';
import { ConfigError } from './errors';

const BUCKET = 'member-qr';
const SIGNED_URL_TTL = 60 * 60; // one hour

/**
 * The service-role client, built once per container.
 *
 * It used to be constructed on every call, and the members page calls
 * getQrSignedUrl once per person — so a single page view built as many clients
 * as there are members. Nothing here holds a database connection, so this was
 * never the cause of an outage, but there is no reason to rebuild it.
 */
const globalForStorage = globalThis as unknown as {
  storageAdmin?: ReturnType<typeof createClient>;
};

function admin() {
  if (globalForStorage.storageAdmin) return globalForStorage.storageAdmin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ConfigError('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  }

  globalForStorage.storageAdmin = createClient(url, key, {
    auth: { persistSession: false },
  });
  return globalForStorage.storageAdmin;
}

/** File extension derived from the MIME type, so Storage serves the right content-type on download. */
function extensionFor(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
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
 * Remove somebody's QR image from Storage.
 *
 * Failing to delete the file is not treated as an error: the record pointing at
 * it is cleared either way, so a leftover object in the bucket is unreachable
 * rather than harmful. Refusing to clear the column because the file could not
 * be removed would leave the member stuck with a QR they asked to be rid of.
 */
export async function deleteQrFile(path: string): Promise<void> {
  try {
    await admin().storage.from(BUCKET).remove([path]);
  } catch {
    // Left in the bucket, no longer referenced by anything.
  }
}

/**
 * The bucket is kept private, so there is no public URL. Every member is meant
 * to be able to see everyone else's QR code — the point is that anyone can pay
 * anyone without having to ask for their details first — so this function does
 * no per-person permission check. Phase 2 will add the "must be signed in"
 * condition exactly here.
 */
export async function getQrSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data.signedUrl;
}
