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
    const out = calculateSettlement({ members, dailySessions: [session()], expenses: [] });
    expect(out.rows.find((r) => r.memberId === 'a')!.totalPaid).toBe(180000);
    expect(out.rows.find((r) => r.memberId === 'b')!.totalPaid).toBe(100000);
  });

  it('chỉ chia cho người có mặt', () => {
    const out = calculateSettlement({ members, dailySessions: [session()], expenses: [] });
    expect(out.rows.find((r) => r.memberId === 'c')!.totalShare).toBe(0);
    expect(out.rows.find((r) => r.memberId === 'c')!.sessionsAttendedCount).toBe(0);
  });

  it('chia cho toàn bộ thành viên khi buổi không ghi người có mặt', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [session({ attendeeIds: [] })],
      expenses: [],
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
      expenses: [],
    });
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(280000);
  });

  it('shuttlecockTotalFee thắng phép nhân số lượng với đơn giá', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [session({ shuttlecockTotalFee: 90000 })],
      expenses: [],
    });
    expect(out.totalShuttleCost).toBe(90000);
  });

  it('khoản chi custom chỉ chia cho người trong danh sách', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [],
      expenses: [
        {
          id: 'e1',
          title: 'Chè',
          category: 'gathering',
          amount: 120000,
          paidById: 'a',
          splitType: 'custom',
          participantIds: ['a', 'b'],
        },
      ],
    });
    expect(out.rows.find((r) => r.memberId === 'c')!.expenseShare).toBe(0);
    expect(out.rows.find((r) => r.memberId === 'a')!.expenseShare).toBe(60000);
  });

  it('khoản chi splitType all chia cho mọi thành viên', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [],
      expenses: [
        {
          id: 'e1',
          title: 'Nước',
          category: 'drink',
          amount: 90000,
          paidById: 'a',
          splitType: 'all',
          participantIds: [],
        },
      ],
    });
    expect(out.rows.every((r) => r.expenseShare === 30000)).toBe(true);
  });

  it('tổng số dư ròng của cả nhóm bằng không', () => {
    const out = calculateSettlement({ members, dailySessions: [session()], expenses: [] });
    expect(out.rows.reduce((s, r) => s + r.netBalance, 0)).toBe(0);
  });

  it('không sinh giao dịch khi chênh lệch dưới 500 đồng', () => {
    const out = calculateSettlement({
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      dailySessions: [],
      expenses: [
        {
          id: 'e1',
          title: 'Lẻ',
          category: 'other',
          amount: 400,
          paidById: 'a',
          splitType: 'all',
          participantIds: [],
        },
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
      expenses: [],
    });
    expect(out.transfers).toHaveLength(2);
    expect(out.transfers.every((t) => t.toMemberId === 'a')).toBe(true);
    expect(out.transfers.reduce((s, t) => s + t.amount, 0)).toBe(
      out.rows.find((r) => r.memberId === 'a')!.netBalance
    );
  });

  it('cho kết quả giống hệt nhau giữa các lần chạy', () => {
    const input: SettlementInput = { members, dailySessions: [session()], expenses: [] };
    expect(calculateSettlement(input)).toEqual(calculateSettlement(input));
  });
});
