import { describe, expect, it } from 'vitest';
import { formatVND, parseVNDInput } from './money';

describe('formatVND', () => {
  it('định dạng số nguyên đồng theo kiểu Việt Nam', () => {
    expect(formatVND(180000)).toBe('180.000 đ');
  });

  it('trả về 0 đ khi nhận số không hợp lệ', () => {
    expect(formatVND(NaN)).toBe('0 đ');
  });
});

describe('parseVNDInput', () => {
  it('hiểu hậu tố k là nghìn', () => {
    expect(parseVNDInput('200k')).toBe(200000);
  });

  it('hiểu hậu tố tr là triệu', () => {
    expect(parseVNDInput('1tr')).toBe(1000000);
  });

  it('hiểu số thập phân với hậu tố triệu', () => {
    expect(parseVNDInput('1,5tr')).toBe(1500000);
  });

  it('bỏ qua dấu phân cách nghìn', () => {
    expect(parseVNDInput('180.000')).toBe(180000);
  });

  it('trả 0 với chuỗi rỗng', () => {
    expect(parseVNDInput('')).toBe(0);
  });
});
