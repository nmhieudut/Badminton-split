import { describe, expect, it } from 'vitest';
import { calculateSettlement } from './calculate';
import { applyPayments } from './apply-payments';
import type { SettlementDailySession } from './types';

const members = [
  { id: 'hieu', name: 'Hiếu' },
  { id: 'tuan', name: 'Tuấn' },
  { id: 'ky', name: 'Ky' },
];
const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '';

function buoi(over: Partial<SettlementDailySession> = {}): SettlementDailySession {
  return {
    id: 's1',
    date: '2026-08-08',
    courtFee: 180000,
    courtPayerId: 'hieu',
    shuttlecockCount: 4,
    shuttlecockPricePerItem: 25000,
    shuttlecockTotalFee: null,
    shuttlecockPayerId: 'hieu',
    drinkFee: 0,
    drinkPayerId: null,
    otherFee: 0,
    otherFeePayerId: null,
    attendeeIds: ['hieu', 'tuan', 'ky'],
    ...over,
  };
}

const noOf = (id: string, from: string, out: ReturnType<typeof applyPayments>) =>
  out.transfers.find((t) => t.fromMemberId === from && t.toMemberId === id)!;

describe('sửa tiền buổi đánh sau khi mọi người đã chuyển khoản', () => {
  // Khai báo buổi ở mức X, ai nấy chuyển đủ, rồi mới phát sinh thêm phí.
  const ban_dau = calculateSettlement({ members, dailySessions: [buoi()] });
  const daTraDu = ban_dau.transfers.map((t) => ({
    fromMemberId: t.fromMemberId,
    toMemberId: t.toMemberId,
    amount: t.amount,
  }));

  it('trước khi phát sinh: mọi người đã trả đủ', () => {
    const out = applyPayments(ban_dau.transfers, daTraDu, nameOf);
    expect(out.transfers.every((t) => t.isSettled)).toBe(true);
    expect(out.transfers.every((t) => t.remaining === 0)).toBe(true);
    expect(out.orphans).toEqual([]);
  });

  it('thêm tiền cầu sau buổi đánh thì hiện đúng phần còn thiếu', () => {
    // Đánh xong dùng thêm 2 quả: 4 -> 6 quả, tức thêm 50.000 chia ba.
    const sau = calculateSettlement({
      members,
      dailySessions: [buoi({ shuttlecockCount: 6 })],
    });
    const out = applyPayments(sau.transfers, daTraDu, nameOf);

    const tuan = noOf('hieu', 'tuan', out);
    // Sân 60.000 + cầu 4 quả 34.000 = phần Tuấn đã trả theo mức cũ.
    expect(tuan.paidAmount).toBe(94000);
    // Sân 60.000 + cầu 6 quả 50.000 = phần phải chịu theo mức mới.
    expect(tuan.amount).toBe(110000);
    expect(tuan.remaining).toBe(16000);
    expect(tuan.isSettled).toBe(false);
    expect(out.orphans).toEqual([]);
  });

  it('phát sinh phí khác cũng cộng vào phần còn thiếu', () => {
    const sau = calculateSettlement({
      members,
      dailySessions: [buoi({ otherFee: 60000, otherFeePayerId: 'hieu' })],
    });
    const out = applyPayments(sau.transfers, daTraDu, nameOf);

    const tuan = noOf('hieu', 'tuan', out);
    expect(tuan.remaining).toBe(20000); // 60.000 chia ba
  });

  it('sửa giảm tiền xuống thì thành trả dư, không âm', () => {
    const sau = calculateSettlement({
      members,
      dailySessions: [buoi({ courtFee: 90000 })],
    });
    const out = applyPayments(sau.transfers, daTraDu, nameOf);

    const tuan = noOf('hieu', 'tuan', out);
    expect(tuan.remaining).toBe(0);
    expect(tuan.paidAmount).toBeGreaterThan(tuan.amount);
    expect(tuan.isSettled).toBe(true);
  });
});

describe('sửa buổi đánh làm khoản nợ đổi sang người khác', () => {
  const ban_dau = calculateSettlement({ members, dailySessions: [buoi()] });
  const daTra = [{ fromMemberId: 'tuan', toMemberId: 'hieu', amount: 94000 }];

  it('đổi người ứng tiền thì tiền đã trả cho người cũ không bị nuốt mất', () => {
    // Hoá ra Ky mới là người ứng tiền sân, không phải Hiếu.
    const sau = calculateSettlement({
      members,
      dailySessions: [buoi({ courtPayerId: 'ky', shuttlecockPayerId: 'ky' })],
    });
    const out = applyPayments(sau.transfers, daTra, nameOf);

    // Tuấn giờ nợ Ky toàn bộ, chưa trả đồng nào cho Ky.
    const noKy = noOf('ky', 'tuan', out);
    expect(noKy.paidAmount).toBe(0);
    expect(noKy.remaining).toBe(noKy.amount);

    // Và khoản đã chuyển cho Hiếu phải được nêu ra, không im lặng biến mất.
    expect(out.orphans).toEqual([
      {
        fromMemberId: 'tuan',
        toMemberId: 'hieu',
        fromMemberName: 'Tuấn',
        toMemberName: 'Hiếu',
        amount: 94000,
      },
    ]);
  });
});
