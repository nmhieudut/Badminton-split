import { taoAdminClient } from '../supabase/admin';

export interface TaiKhoan {
  email: string;
  ten: string | null;
  anhDaiDien: string | null;
  /** Lần đăng nhập gần nhất, đã định dạng ở server. */
  lanCuoi: string | null;
}

/**
 * Mọi tài khoản đã từng đăng nhập vào app.
 *
 * Dùng để super admin chọn người mà cấp quyền, thay vì gõ tay địa chỉ email —
 * gõ tay vừa dễ sai chính tả, vừa không cho biết người đó đã vào app hay chưa.
 *
 * Lấy 200 tài khoản đầu; một nhóm cầu lông không bao giờ chạm tới ngưỡng đó.
 */
export async function listAuthUsers(): Promise<TaiKhoan[]> {
  const supabase = taoAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });

  if (error) {
    console.error('[tài khoản] không lấy được danh sách:', error.message);
    return [];
  }

  return data.users
    .filter((u) => u.email)
    .map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const chuoi = (k: string) =>
        typeof meta[k] === 'string' ? (meta[k] as string) : null;

      return {
        email: u.email!.toLowerCase(),
        ten: chuoi('full_name') ?? chuoi('name'),
        anhDaiDien: chuoi('avatar_url') ?? chuoi('picture'),
        lanCuoi: u.last_sign_in_at
          ? new Date(u.last_sign_in_at).toLocaleDateString('vi-VN')
          : null,
      };
    })
    .sort((a, b) => (a.ten ?? a.email).localeCompare(b.ten ?? b.email, 'vi'));
}
