import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { admins } from '../../db/schema';
import { taoServerClient } from '../supabase/server';
import { laEmailAdmin } from './admin-emails';

export type VaiTro = 'super_admin' | 'admin' | null;

export interface NguoiDung {
  email: string | null;
  /** Tên hiển thị từ Google; có thể trống nếu tài khoản không đặt tên. */
  ten: string | null;
  /** Ảnh đại diện Google, dùng thẳng trong thẻ img. */
  anhDaiDien: string | null;
}

/**
 * Người đang đăng nhập, hoặc null nếu là khách.
 *
 * Dùng getUser() chứ không phải getSession(): getUser() hỏi lại máy chủ auth
 * để xác thực token, còn getSession() chỉ đọc cookie nên có thể bị giả mạo.
 */
export async function getSessionUser(): Promise<NguoiDung | null> {
  const supabase = await taoServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Google đặt tên và ảnh ở user_metadata, khóa khác nhau tùy provider.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const chuoi = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string) : null);

  return {
    email: user.email ?? null,
    ten: chuoi('full_name') ?? chuoi('name'),
    anhDaiDien: chuoi('avatar_url') ?? chuoi('picture'),
  };
}

/**
 * Vai trò của người đang đăng nhập.
 *
 * Biến môi trường luôn thắng: một email vừa có trong ADMIN_EMAILS vừa có trong
 * bảng admins thì tính là super admin.
 */
export async function getVaiTro(): Promise<VaiTro> {
  const user = await getSessionUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;

  if (laEmailAdmin(email)) return 'super_admin';

  const [dong] = await db
    .select({ email: admins.email })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  return dong ? 'admin' : null;
}

/** Thông báo chung, không nêu chi tiết cơ chế kiểm quyền. */
const KHONG_DU_QUYEN = 'Bạn không có quyền thực hiện thao tác này.';

/**
 * Chốt chặn của mọi Server Action ghi dữ liệu nghiệp vụ.
 *
 * Đây là nơi quyền được thực thi thật sự. RLS không giúp gì: app kết nối bằng
 * vai trò `postgres`, vốn có rolbypassrls và sở hữu mọi bảng, nên policy không
 * bao giờ áp lên truy vấn của chính mình.
 */
export async function requireAdmin(): Promise<void> {
  const vaiTro = await getVaiTro();
  if (vaiTro === 'admin' || vaiTro === 'super_admin') return;

  console.warn('[phân quyền] từ chối thao tác ghi: không đủ quyền');
  throw new Error(KHONG_DU_QUYEN);
}

/**
 * Chốt chặn riêng cho việc quản lý danh sách admin.
 *
 * Phải là hàm tách biệt, không phải một tham số của requireAdmin(): tách ra thì
 * dùng nhầm là lỗi nhìn thấy được, còn gộp lại thì quên truyền cờ sẽ âm thầm hạ
 * quyền xuống mức thấp hơn. Admin tự thêm được admin khác là ranh giới giữa hai
 * nhóm biến mất mà không có gì báo.
 */
export async function requireSuperAdmin(): Promise<void> {
  if ((await getVaiTro()) === 'super_admin') return;

  console.warn('[phân quyền] từ chối thao tác quản lý admin: không phải super admin');
  throw new Error(KHONG_DU_QUYEN);
}
