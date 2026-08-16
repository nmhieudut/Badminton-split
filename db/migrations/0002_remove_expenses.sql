-- Bỏ tính năng "chi tiêu chung".
--
-- Mục đích của app là tất toán tiền cầu lông cho đủ và công bằng, mà toàn bộ
-- chi phí đó đã nằm trong từng buổi đánh: tiền sân, tiền cầu, nước, phí khác —
-- và mỗi khoản chia đúng cho những người có mặt buổi đó. Bảng khoản chi chung
-- là một đường thứ hai làm cùng một việc, chỉ khác là không gắn với buổi nào.
--
-- Hai bảng này đang rỗng (đã kiểm: 0 dòng, 0 đồng) nên xóa không mất dữ liệu.

DROP TABLE "expense_participants" CASCADE;--> statement-breakpoint
DROP TABLE "expenses" CASCADE;
