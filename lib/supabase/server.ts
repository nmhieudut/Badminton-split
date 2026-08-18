import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ConfigError } from '../errors';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * ONLY getAll/setAll may be used for cookies. The older get/set/remove APIs
 * cause users to be signed out at random, and the cause is very hard to trace.
 */
export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new ConfigError(
      'Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // A Server Component is not allowed to write cookies. Safe to
          // ignore, because the middleware already refreshes the session.
        }
      },
    },
  });
}
