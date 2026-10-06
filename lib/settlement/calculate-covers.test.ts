import { describe, expect, it } from 'vitest';
import { calculateSettlement } from './calculate';
import type { SettlementCover, SettlementDailySession } from './types';

/** A session with only a court fee, so every share is easy to read. */
function court(
  id: string,
  fee: number,
  payerId: string,
  attendeeIds: string[],
  date = '2026-09-03'
): SettlementDailySession {
  return {
    id,
    date,
    courtFee: fee,
    courtPayerId: payerId,
    shuttlecockCount: 0,
    shuttlecockPricePerItem: 0,
    shuttlecockTotalFee: null,
    shuttlecockPayerId: null,
    drinkFee: 0,
    drinkPayerId: null,
    otherFee: 0,
    otherFeePayerId: null,
    attendeeIds,
  };
}

const members = [
  { id: 'h', name: 'Hiền' },
  { id: 's', name: 'Sang' },
  { id: 'p', name: 'Phú' },
];

const sangCoversHien: SettlementCover[] = [
  { memberId: 'h', coveredById: 's', coveredByName: 'Sang' },
];

describe('trả giúp', () => {
  it('gộp phần nợ của Hiền vào khoản Sang chuyển, ghi rõ phần của ai', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [court('d1', 150000, 'p', ['h', 's', 'p'])],
      covers: sangCoversHien,
    });

    expect(out.transfers).toHaveLength(1);
    const [t] = out.transfers;
    expect(t).toMatchObject({ fromMemberId: 's', toMemberId: 'p', amount: 100000 });
    expect(t.lines).toHaveLength(2);
    expect(t.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Sân', amount: 50000 }),
        expect.objectContaining({ label: 'Sân (phần Hiền)', amount: 50000 }),
      ])
    );
  });

  it('tiền người khác nợ Hiền thì Sang nhận, khoản giữa hai người biến mất', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [court('d1', 150000, 'h', ['h', 's', 'p'])],
      covers: sangCoversHien,
    });

    expect(out.transfers).toHaveLength(1);
    const [t] = out.transfers;
    expect(t).toMatchObject({ fromMemberId: 'p', toMemberId: 's', amount: 50000 });
    expect(t.lines).toEqual([{ date: '2026-09-03', label: 'Sân (Hiền ứng)', amount: 50000 }]);
  });

  it('cấn trừ hai chiều sau khi gộp ví', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [
        court('d1', 120000, 'p', ['s', 'p'], '2026-09-01'),
        court('d2', 160000, 'h', ['h', 'p'], '2026-09-02'),
      ],
      covers: sangCoversHien,
    });

    expect(out.transfers).toHaveLength(1);
    const [t] = out.transfers;
    expect(t).toMatchObject({ fromMemberId: 'p', toMemberId: 's', amount: 20000 });
    expect(t.lines).toEqual([
      { date: '2026-09-02', label: 'Sân (Hiền ứng)', amount: 80000 },
      { date: '2026-09-01', label: 'Sân', amount: -60000 },
    ]);
  });

  it('người trả giúp không có trong kỳ vẫn đứng tên chuyển tiền', () => {
    const out = calculateSettlement({
      members: [
        { id: 'd', name: 'Dương' },
        { id: 'p', name: 'Phú' },
      ],
      dailySessions: [court('d1', 100000, 'p', ['d', 'p'])],
      covers: [{ memberId: 'd', coveredById: 'l', coveredByName: 'Long' }],
    });

    expect(out.transfers).toEqual([
      {
        fromMemberId: 'l',
        fromMemberName: 'Long',
        toMemberId: 'p',
        toMemberName: 'Phú',
        amount: 50000,
        lines: [{ date: '2026-09-03', label: 'Sân (phần Dương)', amount: 50000 }],
      },
    ]);
  });

  it('bảng số dư vẫn tách riêng từng người, chỉ thêm tên người trả giúp', () => {
    const dailySessions = [court('d1', 150000, 'p', ['h', 's', 'p'])];
    const plain = calculateSettlement({ members, dailySessions });
    const covered = calculateSettlement({ members, dailySessions, covers: sangCoversHien });

    expect(covered.rows.map(({ coveredByName: _coveredByName, ...r }) => r)).toEqual(plain.rows);
    expect(covered.rows.find((r) => r.memberId === 'h')!.coveredByName).toBe('Sang');
    expect(covered.rows.find((r) => r.memberId === 's')!.coveredByName).toBeUndefined();
  });

  it('tổng tiền chuyển đi vẫn khớp tổng phần phải trả của cả ví', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [court('d1', 100000, 'p', ['h', 's', 'p'])],
      covers: sangCoversHien,
    });
    const shareOf = (id: string) => out.rows.find((r) => r.memberId === id)!.totalShare;

    // 100.000 / 3 is rounded up to 34.000 each.
    expect(out.transfers[0].amount).toBe(shareOf('h') + shareOf('s'));
    expect(out.transfers[0].amount).toBe(68000);
  });

  it('không cài trả giúp thì kết quả y như cũ', () => {
    const dailySessions = [
      court('d1', 150000, 'p', ['h', 's', 'p']),
      court('d2', 90000, 'h', ['h', 's']),
    ];
    expect(calculateSettlement({ members, dailySessions, covers: [] })).toEqual(
      calculateSettlement({ members, dailySessions })
    );
  });

  it('bỏ qua cài đặt cho người không có trong kỳ', () => {
    const dailySessions = [court('d1', 150000, 'p', ['h', 's', 'p'])];
    expect(
      calculateSettlement({
        members,
        dailySessions,
        covers: [{ memberId: 'x', coveredById: 's', coveredByName: 'Sang' }],
      })
    ).toEqual(calculateSettlement({ members, dailySessions }));
  });
});
