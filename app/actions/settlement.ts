'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { months, settledTransfers } from '../../db/schema';

/**
 * Đánh dấu hoặc bỏ đánh dấu một giao dịch đã chuyển khoản.
 *
 * NGOẠI LỆ CÓ CHỦ ĐÍCH: action này KHÔNG gọi requireAdmin().
 *
 * Người vừa chuyển tiền xong muốn tích luôn, và bắt họ đăng nhập bằng Google
 * chỉ để bấm một nút là rào cản lớn hơn giá trị nó bảo vệ. Đánh đổi: ai có link
 * cũng đánh dấu được, kể cả người chưa trả, và không lưu vết ai bấm. Chấp nhận
 * được vì dấu này chỉ để cả nhóm theo dõi lẫn nhau, không phải chứng từ, và
 * bấm nhầm thì bấm lại là xong.
 *
 * Ngoại lệ này được khai báo trong actions-guard.test.ts. Đừng bỏ chốt chặn ở
 * bất kỳ action nào khác mà không khai báo ở đó — test sẽ đỏ, và nó nên đỏ.
 *
 * Khóa theo cặp người, không kèm số tiền. Bản cũ dùng khóa
 * "{người nợ}-{người nhận}-{số tiền}" nên chỉ cần thêm một buổi đánh là số tiền
 * đổi, khóa đổi theo, và dấu đã chuyển khoản âm thầm biến mất.
 */
export async function toggleTransferSettled(
  monthKey: string,
  fromMemberId: string,
  toMemberId: string
) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  const dieuKien = and(
    eq(settledTransfers.monthId, month.id),
    eq(settledTransfers.fromMemberId, fromMemberId),
    eq(settledTransfers.toMemberId, toMemberId)
  );

  const [existing] = await db.select().from(settledTransfers).where(dieuKien).limit(1);

  if (existing) {
    await db.delete(settledTransfers).where(dieuKien);
  } else {
    await db.insert(settledTransfers).values({
      monthId: month.id,
      fromMemberId,
      toMemberId,
    });
  }

  revalidatePath(`/${monthKey}`, 'layout');
}
