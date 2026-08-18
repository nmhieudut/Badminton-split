'use server';

import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '../../lib/supabase/server';

/**
 * Hai action trong tệp này KHÔNG gọi requireAdmin(): chưa đăng nhập thì làm
 * sao là admin được. Đây là ngoại lệ duy nhất, và test quét mã nguồn trong
 * actions-guard.test.ts có ghi nhận điều đó.
 */

export async function signInWithGoogle(next: string = '/') {
  const supabase = await createServerSupabaseClient();
  const origin = (await headers()).get('origin') ?? '';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    console.error('[đăng nhập] không tạo được liên kết Google:', error?.message);
    throw new Error('Không mở được trang đăng nhập. Vui lòng thử lại.');
  }

  // redirect() hoạt động bằng cách ném lỗi — không bọc nó trong try/catch.
  // Ép kiểu vì typedRoutes chỉ biết các tuyến nội bộ, còn đây là URL của Google.
  redirect(data.url as Route);
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
}
