import { describe, expect, it } from 'vitest';
import { ROUNDING_UNIT, allocate } from './allocate';

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
const ids = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

describe('allocate', () => {
  it('chia đều khi chia hết', () => {
    const r = allocate(180000, ['a', 'b', 'c']);
    expect([...r.values()]).toEqual([60000, 60000, 60000]);
  });

  it('làm tròn lên nghìn khi chia lẻ', () => {
    // 108.000 chia 5 = 21.600 -> mỗi người 22.000
    const r = allocate(108000, ids(5));
    expect([...r.values()]).toEqual([22000, 22000, 22000, 22000, 22000]);
  });

  it('không ai phải trả số lẻ dưới nghìn', () => {
    for (const total of [180000, 100000, 108000, 280000, 55000, 100500]) {
      for (const n of [2, 3, 5, 6, 7]) {
        const r = allocate(total, ids(n));
        expect([...r.values()].every((v) => v % ROUNDING_UNIT === 0)).toBe(true);
      }
    }
  });

  it('mọi người trả đúng bằng nhau, không ai gánh phần dư', () => {
    for (const n of [2, 3, 5, 6, 7]) {
      const values = [...allocate(280000, ids(n)).values()];
      expect(Math.max(...values) - Math.min(...values)).toBe(0);
    }
  });

  it('luôn thu đủ, không bao giờ thiếu so với số đã chi', () => {
    for (const total of [180000, 108000, 280000, 55000, 100500]) {
      for (const n of [2, 3, 5, 6, 7]) {
        expect(sum(allocate(total, ids(n)))).toBeGreaterThanOrEqual(total);
      }
    }
  });

  it('phần thu dư do làm tròn không vượt quá một nghìn mỗi người', () => {
    for (const total of [108000, 280000, 55000, 100500]) {
      for (const n of [2, 3, 5, 6, 7]) {
        const thua = sum(allocate(total, ids(n))) - total;
        expect(thua).toBeLessThan(n * ROUNDING_UNIT);
      }
    }
  });

  it('cho kết quả giống nhau giữa các lần chạy bất kể thứ tự đầu vào', () => {
    const r1 = allocate(100000, ['b', 'a', 'c']);
    const r2 = allocate(100000, ['c', 'b', 'a']);
    for (const id of ['a', 'b', 'c']) expect(r1.get(id)).toBe(r2.get(id));
  });

  it('trả Map rỗng khi không có ai', () => {
    expect(allocate(180000, []).size).toBe(0);
  });

  it('xử lý tổng bằng không', () => {
    expect(sum(allocate(0, ['a', 'b']))).toBe(0);
  });
});
