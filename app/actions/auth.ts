'use server';

import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '../../lib/supabase/server';

/**
 * The two actions in this file do NOT call requireAdmin(): someone who is not
 * signed in yet cannot possibly be an admin. This is the only exemption, and
 * the source-scanning test in actions-guard.test.ts records it.
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

  // redirect() works by throwing — never wrap it in a try/catch.
  // Cast because typedRoutes only knows internal routes, and this is a Google URL.
  redirect(data.url as Route);
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
}
