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
    // A 600đ court fee split two ways: each owes 300, and whoever fronted the
    // money is 300 up — below the 500 threshold, so not worth asking anyone to
    // make a transfer.
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

  it('nợ đúng người đã ứng tiền, không gom qua người thứ ba', () => {
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

  it('bù trừ khi hai người nợ qua lại nhau', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [
        // a ứng 100.000 cho hai người -> b nợ a 50.000
        session({
          id: 's1',
          attendeeIds: ['a', 'b'],
          courtFee: 100000,
          courtPayerId: 'a',
          shuttlecockCount: 0,
          shuttlecockPricePerItem: 0,
          shuttlecockPayerId: null,
        }),
        // b ứng 80.000 cho hai người -> a nợ b 40.000
        session({
          id: 's2',
          attendeeIds: ['a', 'b'],
          courtFee: 80000,
          courtPayerId: 'b',
          shuttlecockCount: 0,
          shuttlecockPricePerItem: 0,
          shuttlecockPayerId: null,
        }),
      ],
    });

    expect(out.transfers).toHaveLength(1);
    expect(out.transfers[0]).toMatchObject({
      fromMemberId: 'b',
      toMemberId: 'a',
      amount: 10000,
    });
    // Khoản chạy ngược lại hiện thành số âm để đối chiếu được.
    expect(out.transfers[0].lines.map((l) => l.amount).sort((x, y) => x - y)).toEqual([
      -40000, 50000,
    ]);
  });

  it('mọi khoản phải truy được về một buổi có thật', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [session({ attendeeIds: ['a', 'b', 'c'] })],
    });

    for (const t of out.transfers) {
      expect(t.lines.length).toBeGreaterThan(0);
      expect(t.lines.reduce((s, l) => s + l.amount, 0)).toBe(t.amount);
    }
  });

  it('cho kết quả giống hệt nhau giữa các lần chạy', () => {
    const input: SettlementInput = { members, dailySessions: [session()] };
    expect(calculateSettlement(input)).toEqual(calculateSettlement(input));
  });
});

describe('điểm danh mồ côi — id không thuộc danh sách thành viên', () => {
  // A session can hold the id of someone removed from the period, or an id
  // picked up by mistake from another period via getSessionDefaults. allocate()
  // used to divide across every id in attendeeIds while only crediting people
  // present in members, so the strangers' shares disappeared: 200.000 split 11
  // ways only added back up to 90.910.
  const members = [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ];

  const sessionWithStrangers = {
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
    const out = calculateSettlement({ members, dailySessions: [sessionWithStrangers] });
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(200000);
  });

  it('tổng số dư ròng vẫn bằng không', () => {
    const out = calculateSettlement({ members, dailySessions: [sessionWithStrangers] });
    expect(out.rows.reduce((s, r) => s + r.netBalance, 0)).toBe(0);
  });

  it('chia đều cho những người thật sự có trong kỳ', () => {
    const out = calculateSettlement({ members, dailySessions: [sessionWithStrangers] });
    expect(out.rows.find((r) => r.memberId === 'a')!.totalShare).toBe(100000);
    expect(out.rows.find((r) => r.memberId === 'b')!.totalShare).toBe(100000);
  });

  it('bỏ hết id lạ thì coi như buổi không ghi điểm danh, chia cho cả nhóm', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [{ ...sessionWithStrangers, attendeeIds: ['nguoi-la-1', 'nguoi-la-2'] }],
    });
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(200000);
  });

});

/*
 * The period that exposed the problem. Tuấn marked his transfers paid on 21/08,
 * then played again on 22/08. Under the old net-balance optimiser he had been
 * told to send Phú 12.000 and Hiếu 44.000 — neither figure matching any evening
 * he was present at, which is what nobody could check.
 */
describe('kỳ 08/2026 ngoài đời thật', () => {
  const roster = [
    { id: 'hieu', name: 'Hiếu' },
    { id: 'ky', name: 'Ky' },
    { id: 'phu', name: 'Phú' },
    { id: 'tuan', name: 'Tuấn' },
    { id: 'long', name: 'Tuất Long' },
    { id: 'sang', name: 'Tuất Sang' },
    { id: 'nguyen', name: 'Tuất Nguyên' },
  ];

  const real: SettlementDailySession[] = [
    {
      id: 's0808',
      date: '2026-08-08',
      courtFee: 180000,
      courtPayerId: 'hieu',
      shuttlecockCount: 4,
      shuttlecockPricePerItem: 25000,
      shuttlecockTotalFee: null,
      shuttlecockPayerId: 'phu',
      drinkFee: 0,
      drinkPayerId: null,
      otherFee: 0,
      otherFeePayerId: null,
      attendeeIds: ['hieu', 'ky', 'phu', 'tuan', 'sang'],
    },
    {
      id: 's1608',
      date: '2026-08-16',
      courtFee: 100000,
      courtPayerId: 'phu',
      shuttlecockCount: 4,
      shuttlecockPricePerItem: 25000,
      shuttlecockTotalFee: null,
      shuttlecockPayerId: 'phu',
      drinkFee: 0,
      drinkPayerId: null,
      otherFee: 0,
      otherFeePayerId: null,
      attendeeIds: ['hieu', 'ky', 'phu', 'long', 'sang'],
    },
    {
      id: 's2208',
      date: '2026-08-22',
      courtFee: 180000,
      courtPayerId: 'hieu',
      shuttlecockCount: 4,
      shuttlecockPricePerItem: 27000,
      shuttlecockTotalFee: null,
      shuttlecockPayerId: 'hieu',
      drinkFee: 0,
      drinkPayerId: null,
      otherFee: 0,
      otherFeePayerId: null,
      attendeeIds: ['hieu', 'ky', 'tuan', 'nguyen', 'sang'],
    },
  ];

  const out = calculateSettlement({ members: roster, dailySessions: real });

  it('Tuấn chỉ nợ đúng hai người đã ứng tiền cho buổi anh có mặt', () => {
    const cua_tuan = out.transfers.filter((t) => t.fromMemberId === 'tuan');
    expect(cua_tuan.map((t) => [t.toMemberId, t.amount]).sort()).toEqual([
      // sân 8/8 (36.000) + sân & cầu 22/8 (36.000 + 21.600)
      ['hieu', 93600],
      // cầu 8/8
      ['phu', 20000],
    ]);
  });

  it('Tuấn không bị bảo chuyển cho người anh chưa từng đánh cùng buổi họ ứng tiền', () => {
    const nguoiNhan = out.transfers
      .filter((t) => t.fromMemberId === 'tuan')
      .map((t) => t.toMemberId);
    expect(nguoiNhan).not.toContain('long');
    expect(nguoiNhan).not.toContain('sang');
  });

  it('tổng phải trả của Tuấn vẫn bằng đúng số dư ròng của anh', () => {
    const net = out.rows.find((r) => r.memberId === 'tuan')!.netBalance;
    const phaiTra = out.transfers
      .filter((t) => t.fromMemberId === 'tuan')
      .reduce((s, t) => s + t.amount, 0);
    expect(phaiTra).toBe(-net);
    expect(phaiTra).toBe(113600);
  });

  it('mọi khoản đều đối chiếu được với buổi Tuấn thật sự có mặt', () => {
    const ngayCoMat = new Set(['2026-08-08', '2026-08-22']);
    for (const t of out.transfers.filter((x) => x.fromMemberId === 'tuan')) {
      for (const line of t.lines) expect(ngayCoMat.has(line.date)).toBe(true);
    }
  });
});
