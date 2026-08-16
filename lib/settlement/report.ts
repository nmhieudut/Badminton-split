import { formatVND } from '../money';
import type { SettlementOutput } from './types';

export interface ReportArgs {
  title: string;
  monthKey: string;
  memberCount: number;
  sessionCount: number;
  settlement: SettlementOutput;
}

export function generateZaloReport(args: ReportArgs): string {
  const { title, monthKey, memberCount, sessionCount, settlement } = args;
  const lines: string[] = [];

  lines.push(`🏸 BẢNG TỔNG KẾT TIỀN CẦU LÔNG - ${title.toUpperCase()} 🏸`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`👥 Tổng thành viên: ${memberCount} người`);
  if (sessionCount > 0) {
    lines.push(`📅 Tổng số buổi đánh trong tháng: ${sessionCount} buổi`);
  }
  lines.push(`💰 Tổng chi phí kỳ này: ${formatVND(settlement.totalExpenses)}`);
  lines.push('');

  lines.push('📊 ĐỐI SOÁT THEO SỐ BUỔI CÓ MẶT CỦA TỪNG NGƯỜI:');
  for (const r of settlement.rows) {
    const status =
      r.netBalance > 500
        ? `👉 ĐƯỢC NHẬN LẠI: +${formatVND(r.netBalance)}`
        : r.netBalance < -500
          ? `👉 CẦN ĐÓNG THÊM: ${formatVND(Math.abs(r.netBalance))}`
          : '👉 ĐÃ ĐỦ (0 đ)';

    const attendance =
      sessionCount > 0 ? ` [Có mặt: ${r.sessionsAttendedCount}/${sessionCount} buổi]` : '';

    lines.push(`• ${r.name}${attendance}:`);
    lines.push(`  - Đã chi trước: ${formatVND(r.totalPaid)}`);
    lines.push(`  - Phần phải chịu: ${formatVND(r.totalShare)}`);
    lines.push(`  ${status}`);
    lines.push('');
  }

  lines.push('💸 HƯỚNG DẪN CHUYỂN KHOẢN THANH TOÁN TỐI ƯU:');
  if (settlement.transfers.length === 0) {
    lines.push('✨ Tất cả thành viên đã thanh toán cân bằng!');
  } else {
    settlement.transfers.forEach((t, i) => {
      lines.push(
        `${i + 1}. [${t.fromMemberName}] chuyển 👉 [${t.toMemberName}]: ${formatVND(t.amount)}`
      );
    });
    lines.push('');
    lines.push('📌 Quét mã QR của người nhận ngay trong app để chuyển khoản.');
  }

  lines.push('');
  lines.push(`📌 Nội dung CK: [Tên_bạn] tien cau long ${monthKey}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('Cảm ơn cả nhóm đã cùng ra sân! 🏸🔥');

  return lines.join('\n');
}
