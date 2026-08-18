import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

/**
 * Google returns the user to Supabase, and Supabase forwards them here with a
 * `code`. Exchange the code for a session, then send them back to the page they
 * were viewing before signing in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only internal paths are accepted, which blocks open redirects to an
      // external site.
      const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      return NextResponse.redirect(`${origin}${destination}`);
    }
    console.error('[đăng nhập] đổi mã lấy phiên thất bại:', error.message);
  }

  return NextResponse.redirect(`${origin}/?loi=dangnhap`);
}
