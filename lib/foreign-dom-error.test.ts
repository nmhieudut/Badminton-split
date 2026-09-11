import { describe, expect, it } from 'vitest';
import { AUTO_RETRY_WINDOW_MS, claimAutoRetry, isForeignDomError } from './foreign-dom-error';

describe('nhận ra lỗi DOM do extension', () => {
  it('bắt đúng lỗi insertBefore / removeChild thật từ production', () => {
    expect(isForeignDomError({ name: 'NotFoundError', message: "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node." })).toBe(true);
    expect(isForeignDomError({ name: 'Error', message: "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node." })).toBe(true);
  });

  it('không nhận nhầm lỗi của app', () => {
    expect(isForeignDomError({ name: 'Error', message: 'Không tìm thấy tháng' })).toBe(false);
    expect(isForeignDomError({ name: 'TypeError', message: "Cannot read properties of undefined (reading 'id')" })).toBe(false);
  });
});

describe('tự thử lại tối đa một lần', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

  it('lần đầu được thử lại, lần ngay sau thì không — không bao giờ lặp', () => {
    const s = mem();
    expect(claimAutoRetry(s, 1_000_000)).toBe(true);
    expect(claimAutoRetry(s, 1_000_500)).toBe(false);
  });

  it('qua khỏi cửa sổ thời gian thì được thử lại lần nữa', () => {
    const s = mem();
    claimAutoRetry(s, 1_000_000);
    expect(claimAutoRetry(s, 1_000_000 + AUTO_RETRY_WINDOW_MS + 1)).toBe(true);
  });

  it('không có bộ nhớ thì từ chối, thà không thử còn hơn lặp vô hạn', () => {
    expect(claimAutoRetry(null)).toBe(false);
    expect(claimAutoRetry({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe(false);
  });
});
