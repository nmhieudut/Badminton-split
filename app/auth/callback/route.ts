import { NextResponse, type NextRequest } from 'next/server';
import { taoServerClient } from '../../../lib/supabase/server';

/**
 * Google trả người dùng về Supabase, Supabase đẩy tiếp về đây kèm mã `code`.
 * Đổi mã lấy phiên rồi đưa họ về đúng trang đang xem trước khi đăng nhập.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await taoServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Chỉ nhận đường dẫn nội bộ, chặn chuyển hướng ra ngoài.
      const dich = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      return NextResponse.redirect(`${origin}${dich}`);
    }
    console.error('[đăng nhập] đổi mã lấy phiên thất bại:', error.message);
  }

  return NextResponse.redirect(`${origin}/?loi=dangnhap`);
}
