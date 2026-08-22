import { describe, expect, it } from 'vitest';
import { formatVnDateTime, vnDateStr, vnParts } from './vn-time';

/*
 * The whole point of this module is that its answer does not depend on the
 * machine. The server runs in UTC and the viewer's browser runs in their own
 * zone; when those two produced different text, React was handed a tree that
 * did not match the HTML and a later update failed while inserting a node.
 */
describe('giờ Việt Nam', () => {
  const stamp = '2026-08-22T17:30:00Z'; // 00:30 ngày 23/08 giờ VN

  it('đổi đúng sang giờ Việt Nam, kể cả khi qua ngày', () => {
    expect(formatVnDateTime(stamp)).toBe('23/08/2026 · 00:30');
    expect(vnDateStr(stamp)).toBe('2026-08-23');
  });

  it('cho kết quả GIỐNG NHAU dù máy đặt ở múi giờ nào', () => {
    const goc = process.env.TZ;
    const ketQua = new Set<string>();
    for (const tz of ['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York', 'Australia/Sydney']) {
      process.env.TZ = tz;
      ketQua.add(formatVnDateTime(stamp) + '|' + vnDateStr(stamp));
    }
    process.env.TZ = goc;
    expect(ketQua.size).toBe(1);
  });

  it('nửa đêm giờ VN rơi đúng sang ngày mới', () => {
    expect(vnDateStr('2026-08-22T16:59:59Z')).toBe('2026-08-22'); // 23:59:59 VN
    expect(vnDateStr('2026-08-22T17:00:00Z')).toBe('2026-08-23'); // 00:00:00 VN
  });

  it('tách đúng từng phần', () => {
    expect(vnParts(stamp)).toEqual({ year: 2026, month: 8, day: 23, hours: 0, minutes: 30 });
  });

  it('nhận cả Date lẫn chuỗi', () => {
    expect(formatVnDateTime(new Date(stamp))).toBe(formatVnDateTime(stamp));
  });
});
