import { createClient } from '@supabase/supabase-js';
import { ConfigError } from '../errors';

/**
 * Client dùng service role key — TOÀN QUYỀN, chỉ được gọi từ server.
 *
 * Không bao giờ đưa client này, hay khóa của nó, xuống trình duyệt.
 */
export function createAdminSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ConfigError('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
