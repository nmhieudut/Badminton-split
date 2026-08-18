/**
 * Tên cookie ghi nhớ ai đang cầm máy.
 *
 * Đặt ở module trung lập, KHÔNG phải trong tệp có `'use client'`. Next.js biến
 * mọi export của một module client thành tham chiếu client, nên nếu Server
 * Component import hằng số từ đó thì nhận về một proxy chứ không phải chuỗi —
 * `cookies().get(...)` sẽ luôn trả rỗng, và TypeScript không báo lỗi vì kiểu
 * khai báo vẫn là string.
 */
export const ME_COOKIE = 'bs_me';

/** Ghi nhớ một năm; đây là tuỳ chọn thiết bị, không phải phiên đăng nhập. */
export const ME_COOKIE_DAYS = 365;
