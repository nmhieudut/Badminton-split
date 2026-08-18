/**
 * Email này có phải SUPER ADMIN không — đọc từ biến môi trường ADMIN_EMAILS.
 *
 * Quyền cao nhất để ở biến môi trường chứ không phải database là có chủ đích:
 * chỉ đổi được bằng cách deploy lại, nên không có đường nào chiếm nó qua giao
 * diện. Admin thường thì nằm trong bảng `admins` và do super admin quản lý.
 *
 * Đọc lại biến ở mỗi lần gọi thay vì cache, để đổi biến trên Vercel là có hiệu
 * lực ngay ở lần gọi kế tiếp.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const rows = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Danh sách rỗng nghĩa là không có super admin nào. Hỏng theo hướng an toàn:
  // quên khai báo biến thì mất tính năng, chứ không phải mở toang cửa.
  if (rows.length === 0) return false;

  return rows.includes(email.trim().toLowerCase());
}
