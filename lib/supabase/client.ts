import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client that runs in the browser. Used only for the sign-in flow.
 *
 * These two NEXT_PUBLIC_ variables reach the client by design: the anon key is
 * a public key. Never put the service role key in here.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
