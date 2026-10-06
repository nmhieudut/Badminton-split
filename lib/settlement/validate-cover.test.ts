import { describe, expect, it } from 'vitest';
import { acceptInheritedCovers, pickInheritedCovers, validateCover } from './validate-cover';

describe('validateCover', () => {
  const current = new Map([['h', 's']]); // Sang covers Hiền

  it('cho phép cài người trả giúp hợp lệ', () => {
    expect(validateCover(current, 'd', 'l')).toBeNull();
  });

  it('bỏ trả giúp luôn hợp lệ', () => {
    expect(validateCover(current, 'h', null)).toBeNull();
  });

  it('không cho tự trả giúp chính mình', () => {
    expect(validateCover(current, 'd', 'd')).toMatch(/chính mình/);
  });

  it('không cho chọn người đang được người khác trả giúp', () => {
    expect(validateCover(current, 'd', 'h')).toMatch(/đang được/);
  });

  it('không cho người đang trả giúp ai đó lại được người khác trả giúp', () => {
    expect(validateCover(current, 's', 'l')).toMatch(/đang trả giúp/);
  });

  it('đổi người trả giúp của chính người đó thì không tính là nối chuỗi', () => {
    expect(validateCover(current, 'h', 'l')).toBeNull();
  });
});

describe('acceptInheritedCovers', () => {
  it('giữ các cặp hợp lệ từ kỳ trước', () => {
    const accepted = acceptInheritedCovers(
      new Map(),
      new Map([
        ['h', 's'],
        ['d', 'l'],
      ])
    );
    expect(accepted).toEqual(
      new Map([
        ['h', 's'],
        ['d', 'l'],
      ])
    );
  });

  it('bỏ cặp tạo thành chuỗi với cặp đang có trong kỳ', () => {
    // In the new period Long is already covered by Tùng, so Long can no longer cover Dương.
    const accepted = acceptInheritedCovers(new Map([['l', 't']]), new Map([['d', 'l']]));
    expect(accepted).toEqual(new Map());
  });

  it('bỏ cặp tự trả giúp mình', () => {
    expect(acceptInheritedCovers(new Map(), new Map([['h', 'h']]))).toEqual(new Map());
  });
});

describe('pickInheritedCovers', () => {
  it('lấy cặp ở kỳ gần nhất của từng người, chỉ khi được đánh dấu lặp lại', () => {
    const picked = pickInheritedCovers([
      { memberId: 'h', coveredById: 's', recurring: true, monthKey: '2026-09' },
      { memberId: 'h', coveredById: 'x', recurring: true, monthKey: '2026-08' },
      { memberId: 'd', coveredById: 'l', recurring: false, monthKey: '2026-09' },
    ]);
    expect(picked).toEqual(new Map([['h', 's']]));
  });

  it('trả giúp chỉ kỳ này thì kỳ sau người đó tự trả, kể cả khi kỳ trước nữa có cài lặp lại', () => {
    const picked = pickInheritedCovers([
      { memberId: 'd', coveredById: 'l', recurring: false, monthKey: '2026-09' },
      { memberId: 'd', coveredById: 'l', recurring: true, monthKey: '2026-08' },
    ]);
    expect(picked).toEqual(new Map());
  });

  it('kỳ gần nhất đã bỏ trả giúp thì không chép', () => {
    const picked = pickInheritedCovers([
      { memberId: 'h', coveredById: null, recurring: true, monthKey: '2026-09' },
      { memberId: 'h', coveredById: 's', recurring: true, monthKey: '2026-08' },
    ]);
    expect(picked).toEqual(new Map());
  });

  it('không phụ thuộc thứ tự dòng đầu vào', () => {
    const picked = pickInheritedCovers([
      { memberId: 'h', coveredById: 'x', recurring: true, monthKey: '2026-08' },
      { memberId: 'h', coveredById: 's', recurring: true, monthKey: '2026-09' },
    ]);
    expect(picked).toEqual(new Map([['h', 's']]));
  });
});
