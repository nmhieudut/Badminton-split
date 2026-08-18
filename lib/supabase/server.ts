import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ConfigError } from '../errors';

/**
 * Supabase client dùng trong Server Component, Server Action và Route Handler.
 *
 * CHỈ dùng getAll/setAll cho cookie. Các API get/set/remove kiểu cũ gây ra
 * chuyện người dùng bị đăng xuất ngẫu nhiên và rất khó truy nguyên.
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
          // Server Component không được ghi cookie. Bỏ qua an toàn vì
          // middleware đã lo việc làm mới phiên.
        }
      },
    },
  });
}
