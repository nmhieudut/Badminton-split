import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client chạy trong trình duyệt. Chỉ dùng cho luồng đăng nhập.
 *
 * Hai biến NEXT_PUBLIC_ này đi xuống client theo đúng thiết kế: anon key là
 * khóa công khai. Tuyệt đối không đưa service role key vào đây.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
