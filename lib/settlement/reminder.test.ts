import { describe, expect, it } from 'vitest';
import { buildReminder, buildReminders } from './reminder';

const base = {
  fromMemberName: 'Tuấn',
  toMemberName: 'Hiếu',
  remaining: 6000,
  paidAmount: 88000,
  lines: [
    { date: '2026-08-22', label: 'Sân', amount: 36000 },
    { date: '2026-08-22', label: 'Cầu · 4 quả', amount: 22000 },
    { date: '2026-08-08', label: 'Sân', amount: 36000 },
  ],
};

describe('buildReminder', () => {
  it('nói số còn thiếu, không phải số gốc', () => {
    const msg = buildReminder(base);
    expect(msg).toContain('còn 6.000 đ');
    expect(msg.split('\n')[0]).not.toContain('94.000');
  });

  it('nêu đúng từng buổi để người nhận đối chiếu được', () => {
    const msg = buildReminder(base);
    expect(msg).toContain('22/08 Sân: 36.000 đ');
    expect(msg).toContain('22/08 Cầu · 4 quả: 22.000 đ');
    expect(msg).toContain('08/08 Sân: 36.000 đ');
  });

  it('ghi nhận phần đã trả để không gây khó chịu', () => {
    expect(buildReminder(base)).toContain('Đã nhận 88.000 đ rồi');
  });

  it('không nhắc "đã nhận" khi chưa trả đồng nào', () => {
    expect(buildReminder({ ...base, paidAmount: 0, remaining: 94000 })).not.toContain('Đã nhận');
  });

  it('bỏ qua dòng bù trừ âm, chỉ liệt kê khoản người đó thực nợ', () => {
    const msg = buildReminder({
      ...base,
      lines: [...base.lines, { date: '2026-08-16', label: 'Sân', amount: -20000 }],
    });
    expect(msg).not.toContain('-20.000');
    expect(msg).not.toContain('16/08');
  });

  it('đính link QR khi có', () => {
    expect(buildReminder({ ...base, qrPageUrl: 'https://app/2026-08/settlement' })).toContain(
      'Mã QR của Hiếu: https://app/2026-08/settlement'
    );
    expect(buildReminder(base)).not.toContain('Mã QR');
  });
});

describe('buildReminders', () => {
  it('ghép nhiều tin nhắn, mỗi tin vẫn đứng riêng', () => {
    const msg = buildReminders([base, { ...base, fromMemberName: 'Ky', remaining: 94000, paidAmount: 0 }]);
    expect(msg).toContain('Tuấn ơi');
    expect(msg).toContain('Ky ơi');
    expect(msg.split('———')).toHaveLength(2);
  });
});
