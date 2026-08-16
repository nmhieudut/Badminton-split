import { describe, expect, it } from 'vitest';
import { normalizeLegacy } from './normalize-legacy';
import { calculateSettlement } from '../lib/settlement/calculate';
import type { LegacyMonthSession } from './legacy-types';

const thang8: LegacyMonthSession = {
  id: 'session-2026-08',
  monthKey: '2026-08',
  title: 'Tháng 08/2026',
  createdAt: '2026-08-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Tuấn', bankName: 'MB', bankAccount: '0901234567', isPermanent: true },
    { id: 'm2', name: 'Nam', isPermanent: true },
  ],
  dailySessions: [
    {
      id: 'ds1',
      date: '2026-08-03',
      courtName: 'Sân 3',
      courtFee: 180000,
      courtPayerId: 'm1',
      shuttlecockCount: 4,
      shuttlecockPricePerItem: 25000,
      shuttlecockPayerId: 'm2',
      attendeeIds: ['m1', 'm2'],
    },
  ],
  expenses: [],
  settledTransferIds: ['m2-m1-40000'],
};

const thang9: LegacyMonthSession = {
  ...thang8,
  id: 'session-2026-09',
  monthKey: '2026-09',
  title: 'Tháng 09/2026',
  members: [{ id: 'x9', name: ' Tuấn ', isPermanent: true }],
  dailySessions: [],
  settledTransferIds: [],
};

describe('normalizeLegacy', () => {
  it('gộp thành viên trùng tên giữa các tháng thành một bản ghi', () => {
    const out = normalizeLegacy([thang8, thang9]);
    expect(out.members).toHaveLength(2);
    expect(out.members.map((m) => m.name).sort()).toEqual(['Nam', 'Tuấn']);
  });

  it('ghi nhận thành viên thuộc tháng nào', () => {
    const out = normalizeLegacy([thang8, thang9]);
    expect(out.monthMembers.filter((mm) => mm.monthKey === '2026-08')).toHaveLength(2);
    expect(out.monthMembers.filter((mm) => mm.monthKey === '2026-09')).toHaveLength(1);
  });

  it('không giữ lại bất kỳ trường ngân hàng nào', () => {
    const out = normalizeLegacy([thang8]);
    expect(JSON.stringify(out.members)).not.toContain('0901234567');
    expect(JSON.stringify(out.members)).not.toContain('"MB"');
  });

  it('liệt kê người có số tài khoản nhưng chưa có ảnh QR', () => {
    const out = normalizeLegacy([thang8]);
    expect(out.warnings.missingQr).toContain('Tuấn');
  });

  it('bỏ số tiền khỏi khóa giao dịch đã thanh toán', () => {
    const out = normalizeLegacy([thang8]);
    expect(out.settledTransfers).toHaveLength(1);
    expect(out.settledTransfers[0].monthKey).toBe('2026-08');
    const tenNguoiNo = out.members.find(
      (m) => m.id === out.settledTransfers[0].fromMemberId
    )!.name;
    const tenNguoiNhan = out.members.find(
      (m) => m.id === out.settledTransfers[0].toMemberId
    )!.name;
    expect(tenNguoiNo).toBe('Nam');
    expect(tenNguoiNhan).toBe('Tuấn');
  });

  it('dừng lại khi hai người trùng tên nhưng khác số tài khoản', () => {
    const xungDot: LegacyMonthSession = {
      ...thang9,
      members: [{ id: 'z1', name: 'Tuấn', bankAccount: '9999999999', isPermanent: true }],
    };
    expect(() => normalizeLegacy([thang8, xungDot])).toThrow(/trùng tên/i);
  });

  it('chuyển mọi khoản tiền sang số nguyên', () => {
    const out = normalizeLegacy([thang8]);
    expect(Number.isInteger(out.dailySessions[0].courtFee)).toBe(true);
    expect(Number.isInteger(out.dailySessions[0].shuttlecockPricePerItem)).toBe(true);
  });

  it('giữ nguyên ảnh QR để bước sau tải lên Storage', () => {
    const coQr: LegacyMonthSession = {
      ...thang8,
      members: [{ id: 'm1', name: 'Tuấn', qrCodeImage: 'data:image/png;base64,AAA' }],
    };
    const out = normalizeLegacy([coQr]);
    expect(out.members[0].legacyQrImage).toBe('data:image/png;base64,AAA');
  });
});

describe('đối chiếu quyết toán trước và sau khi chuẩn hóa', () => {
  it('danh sách chuyển khoản không đổi về người và số tiền', () => {
    const out = normalizeLegacy([thang8]);
    const tenTheoId = new Map(out.members.map((m) => [m.id, m.name]));

    const sau = calculateSettlement({
      members: out.members.map((m) => ({ id: m.id, name: m.name })),
      dailySessions: out.dailySessions.map((d) => ({
        id: d.id,
        date: d.date,
        courtFee: d.courtFee,
        courtPayerId: d.courtPayerId,
        shuttlecockCount: d.shuttlecockCount,
        shuttlecockPricePerItem: d.shuttlecockPricePerItem,
        shuttlecockTotalFee: d.shuttlecockTotalFee,
        shuttlecockPayerId: d.shuttlecockPayerId,
        drinkFee: d.drinkFee,
        drinkPayerId: d.drinkPayerId,
        otherFee: d.otherFee,
        otherFeePayerId: d.otherFeePayerId,
        attendeeIds: d.attendeeIds,
      })),
      expenses: [],
    });

    // Tuấn ứng 180.000 tiền sân, Nam ứng 100.000 tiền cầu, hai người chia đôi
    // 280.000 nên mỗi người chịu 140.000. Nam còn nợ Tuấn 40.000.
    expect(sau.transfers).toHaveLength(1);
    expect(tenTheoId.get(sau.transfers[0].fromMemberId)).toBe('Nam');
    expect(tenTheoId.get(sau.transfers[0].toMemberId)).toBe('Tuấn');
    expect(sau.transfers[0].amount).toBe(40000);
  });
});
