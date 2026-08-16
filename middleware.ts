import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Chỉ làm mới phiên, KHÔNG chặn ai cả.
 *
 * Ví dụ mẫu trong tài liệu Supabase có đoạn chuyển hướng người chưa đăng nhập
 * về /login. Ở app này các trang là công khai có chủ đích, nên chép đoạn đó
 * vào sẽ chặn hết khách. Việc phân quyền nằm ở requireAdmin() và
 * requireSuperAdmin() trong từng Server Action.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Thiếu cấu hình thì cho request đi tiếp như khách, không làm sập cả trang.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Không chèn bất kỳ code nào giữa createServerClient và getUser().
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
