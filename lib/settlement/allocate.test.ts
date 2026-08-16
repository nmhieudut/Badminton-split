import { describe, expect, it } from 'vitest';
import { allocate } from './allocate';

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

describe('allocate', () => {
  it('chia đều khi chia hết', () => {
    const r = allocate(180000, ['a', 'b', 'c']);
    expect([...r.values()]).toEqual([60000, 60000, 60000]);
  });

  it('tổng các phần chia luôn bằng tổng chi khi chia lẻ', () => {
    const r = allocate(180000, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(sum(r)).toBe(180000);
  });

  it('phần dư được phát mỗi người tối đa một đồng', () => {
    const r = allocate(180000, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const values = [...r.values()];
    expect(Math.max(...values) - Math.min(...values)).toBe(1);
  });

  it('cho kết quả giống nhau giữa các lần chạy bất kể thứ tự đầu vào', () => {
    const r1 = allocate(100, ['b', 'a', 'c']);
    const r2 = allocate(100, ['c', 'b', 'a']);
    expect(r1.get('a')).toBe(r2.get('a'));
    expect(r1.get('b')).toBe(r2.get('b'));
    expect(r1.get('c')).toBe(r2.get('c'));
  });

  it('trả Map rỗng khi không có ai', () => {
    expect(allocate(180000, []).size).toBe(0);
  });

  it('xử lý tổng bằng không', () => {
    const r = allocate(0, ['a', 'b']);
    expect(sum(r)).toBe(0);
  });
});
