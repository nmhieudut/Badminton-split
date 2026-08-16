import { describe, expect, it } from 'vitest';
import { calculateSettlement } from './calculate';
import type { SettlementDailySession, SettlementInput } from './types';

function session(over: Partial<SettlementDailySession> = {}): SettlementDailySession {
  return {
    id: 'ds1',
    date: '2026-08-03',
    courtFee: 180000,
    courtPayerId: 'a',
    shuttlecockCount: 4,
    shuttlecockPricePerItem: 25000,
    shuttlecockTotalFee: null,
    shuttlecockPayerId: 'b',
    drinkFee: 0,
    drinkPayerId: null,
    otherFee: 0,
    otherFeePayerId: null,
    attendeeIds: ['a', 'b'],
    ...over,
  };
}

const members = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
  { id: 'c', name: 'Cường' },
];

describe('calculateSettlement', () => {
  it('ghi có cho người ứng tiền đúng khoản họ trả', () => {
    const out = calculateSettlement({ members, dailySessions: [session()] });
    expect(out.rows.find((r) => r.memberId === 'a')!.totalPaid).toBe(180000);
    expect(out.rows.find((r) => r.memberId === 'b')!.totalPaid).toBe(100000);
  });

  it('chỉ chia cho người có mặt', () => {
    const out = calculateSettlement({ members, dailySessions: [session()] });
    expect(out.rows.find((r) => r.memberId === 'c')!.totalShare).toBe(0);
    expect(out.rows.find((r) => r.memberId === 'c')!.sessionsAttendedCount).toBe(0);
  });

  it('chia cho toàn bộ thành viên khi buổi không ghi người có mặt', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [session({ attendeeIds: [] })],
    });
    expect(out.rows.every((r) => r.totalShare > 0)).toBe(true);
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(280000);
  });

  it('tổng phần chia bằng đúng tổng chi khi chia lẻ', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, name: `M${i}` }));
    const out = calculateSettlement({
      members: seven,
      dailySessions: [
        session({
          attendeeIds: seven.map((m) => m.id),
          courtPayerId: 'm0',
          shuttlecockPayerId: 'm0',
        }),
      ],
    });
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(280000);
  });

  it('shuttlecockTotalFee thắng phép nhân số lượng với đơn giá', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [session({ shuttlecockTotalFee: 90000 })],
    });
    expect(out.totalShuttleCost).toBe(90000);
  });



  it('tổng số dư ròng của cả nhóm bằng không', () => {
    const out = calculateSettlement({ members, dailySessions: [session()] });
    expect(out.rows.reduce((s, r) => s + r.netBalance, 0)).toBe(0);
  });


  it('không sinh giao dịch khi chênh lệch dưới ngưỡng tiền lẻ', () => {
    // Sân 600đ chia đôi: mỗi người chịu 300, người ứng tiền dôi ra 300 — dưới
    // ngưỡng 500 nên không đáng bắt ai chuyển khoản.
    const out = calculateSettlement({
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      dailySessions: [
        session({
          courtFee: 600,
          courtPayerId: 'a',
          shuttlecockCount: 0,
          shuttlecockPricePerItem: 0,
          shuttlecockPayerId: 'a',
          attendeeIds: ['a', 'b'],
        }),
      ],
    });
    expect(out.transfers).toEqual([]);
  });

  it('tối thiểu số lần chuyển khoản', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [
        session({ attendeeIds: ['a', 'b', 'c'], courtPayerId: 'a', shuttlecockPayerId: 'a' }),
      ],
    });
    expect(out.transfers).toHaveLength(2);
    expect(out.transfers.every((t) => t.toMemberId === 'a')).toBe(true);
    expect(out.transfers.reduce((s, t) => s + t.amount, 0)).toBe(
      out.rows.find((r) => r.memberId === 'a')!.netBalance
    );
  });

  it('cho kết quả giống hệt nhau giữa các lần chạy', () => {
    const input: SettlementInput = { members, dailySessions: [session()] };
    expect(calculateSettlement(input)).toEqual(calculateSettlement(input));
  });
});

describe('điểm danh mồ côi — id không thuộc danh sách thành viên', () => {
  // Buổi đánh có thể chứa id của người đã bị gỡ khỏi kỳ, hoặc id lấy nhầm từ
  // kỳ khác qua getSessionDefaults. Trước đây allocate() chia cho toàn bộ id
  // trong attendeeIds nhưng chỉ cộng được cho người có trong members, nên phần
  // của các id lạ biến mất: 200.000 chia 11 chỉ cộng về 90.910.
  const members = [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ];

  const buoi = {
    id: 'ds1',
    date: '2026-08-16',
    courtFee: 100000,
    courtPayerId: 'a',
    shuttlecockCount: 4,
    shuttlecockPricePerItem: 25000,
    shuttlecockTotalFee: null,
    shuttlecockPayerId: 'a',
    drinkFee: 0,
    drinkPayerId: null,
    otherFee: 0,
    otherFeePayerId: null,
    attendeeIds: ['a', 'b', 'nguoi-la-1', 'nguoi-la-2'],
  };

  it('không để thất thoát đồng nào khi có id lạ', () => {
    const out = calculateSettlement({ members, dailySessions: [buoi] });
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(200000);
  });

  it('tổng số dư ròng vẫn bằng không', () => {
    const out = calculateSettlement({ members, dailySessions: [buoi] });
    expect(out.rows.reduce((s, r) => s + r.netBalance, 0)).toBe(0);
  });

  it('chia đều cho những người thật sự có trong kỳ', () => {
    const out = calculateSettlement({ members, dailySessions: [buoi] });
    expect(out.rows.find((r) => r.memberId === 'a')!.totalShare).toBe(100000);
    expect(out.rows.find((r) => r.memberId === 'b')!.totalShare).toBe(100000);
  });

  it('bỏ hết id lạ thì coi như buổi không ghi điểm danh, chia cho cả nhóm', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [{ ...buoi, attendeeIds: ['nguoi-la-1', 'nguoi-la-2'] }],
    });
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(200000);
  });

});
