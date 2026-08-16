import type { getMonthData, getSessionDefaults } from '../db/queries';

/**
 * Kiểu dữ liệu mà giao diện nhận được, suy trực tiếp từ hàm truy vấn để không
 * bao giờ lệch nhau. Component chỉ hiển thị — mọi phép tính đã xong ở server.
 */
export type MonthData = NonNullable<Awaited<ReturnType<typeof getMonthData>>>;

export type ViewMember = MonthData['members'][number];
export type ViewDailySession = MonthData['dailySessions'][number];
export type ViewSettlement = MonthData['settlement'];
export type ViewSettlementRow = ViewSettlement['rows'][number];
export type ViewTransfer = ViewSettlement['transfers'][number];
export type ViewMonth = MonthData['month'];

export type SessionDefaults = Awaited<ReturnType<typeof getSessionDefaults>>;

/** Thành viên kèm signed URL của ảnh QR, dùng ở tab Thành viên và Quyết toán. */
export type ViewMemberWithQr = ViewMember & { qrUrl: string | null };
