/**
 * `redirect()` và `notFound()` của Next.js hoạt động bằng cách NÉM LỖI.
 *
 * Nghĩa là một khối `catch` bình thường sẽ nuốt luôn chúng: người dùng bấm nút,
 * không được chuyển trang, và thấy một thông báo lỗi vô nghĩa. Mọi chỗ bắt lỗi
 * quanh Server Action đều phải ném lại hai loại này.
 */
export function laLoiDieuHuong(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND')
  );
}

/** Thông báo hiện cho người dùng khi một thao tác thất bại. */
export function thongDiepLoi(e: unknown, macDinh = 'Không lưu được. Thử lại giúp.'): string {
  return e instanceof Error && e.message ? e.message : macDinh;
}
