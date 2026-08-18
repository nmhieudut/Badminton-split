import { describe, expect, it } from 'vitest';
import { calculateSettlement } from './calculate';
import { generateZaloReport } from './report';

const members = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
];

const dailySessions = [
  {
    id: 'ds1',
    date: '2026-08-03',
    courtFee: 180000,
    courtPayerId: 'a',
    shuttlecockCount: 4,
    shuttlecockPricePerItem: 25000,
    shuttlecockTotalFee: null,
    shuttlecockPayerId: 'a',
    drinkFee: 0,
    drinkPayerId: null,
    otherFee: 0,
    otherFeePayerId: null,
    attendeeIds: ['a', 'b'],
  },
];

function report() {
  const settlement = calculateSettlement({ members, dailySessions });
  return generateZaloReport({
    title: 'Tháng 08/2026',
    monthKey: '2026-08',
    memberCount: members.length,
    sessionCount: dailySessions.length,
    settlement,
  });
}

describe('generateZaloReport', () => {
  it('nêu tiêu đề kỳ và tổng chi', () => {
    const text = report();
    expect(text).toContain('THÁNG 08/2026');
    expect(text).toContain('280.000 đ');
  });

  it('liệt kê giao dịch chuyển khoản kèm tên hai bên', () => {
    expect(report()).toContain('[Bình] chuyển 👉 [An]');
  });

  it('không chứa bất kỳ thông tin tài khoản ngân hàng nào', () => {
    const text = report();
    expect(text).not.toMatch(/STK|số tài khoản|Vietcombank|MB Bank/i);
  });

  it('báo đã cân bằng khi không còn ai nợ ai', () => {
    const settlement = calculateSettlement({ members, dailySessions: [] });
    const text = generateZaloReport({
      title: 'Tháng 08/2026',
      monthKey: '2026-08',
      memberCount: 2,
      sessionCount: 0,
      settlement,
    });
    expect(text).toContain('đã thanh toán cân bằng');
  });
});

describe('ngưỡng bỏ qua tiền lẻ dùng chung', () => {
  it('báo cáo và phép quyết toán nhất quán: dưới ngưỡng thì vừa không sinh giao dịch, vừa báo đã đủ', () => {
    // A balance of 300 đồng: below ROUNDING_THRESHOLD, so no transfer is
    // generated. The report must say "ĐÃ ĐỦ" and not that they still owe,
    // otherwise the reader goes looking for a transfer that does not exist.
    const settlement = calculateSettlement({
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      dailySessions: [
        {
          id: 'ds-le',
          date: '2026-08-04',
          courtFee: 600,
          courtPayerId: 'a',
          shuttlecockCount: 0,
          shuttlecockPricePerItem: 0,
          shuttlecockTotalFee: null,
          shuttlecockPayerId: 'a',
          drinkFee: 0,
          drinkPayerId: null,
          otherFee: 0,
          otherFeePayerId: null,
          attendeeIds: ['a', 'b'],
        },
      ],
    });

    expect(settlement.transfers).toHaveLength(0);

    const text = generateZaloReport({
      title: 'Tháng 08/2026',
      monthKey: '2026-08',
      memberCount: 2,
      sessionCount: 0,
      settlement,
    });

    expect(text).not.toContain('CẦN ĐÓNG THÊM');
    expect(text).not.toContain('ĐƯỢC NHẬN LẠI');
    expect(text).toContain('ĐÃ ĐỦ');
  });
});
