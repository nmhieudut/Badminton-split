import { createClient } from '@supabase/supabase-js';
import { ConfigError } from '../errors';

/**
 * Client built on the service role key — FULL ACCESS, server-side only.
 *
 * Never ship this client, or its key, to the browser.
 */
export function createAdminSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ConfigError('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
