import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const GOC = process.cwd();

/** Duyệt đệ quy để lấy mọi component, kể cả trong thư mục con. */
function allFiles(thuMuc: string): string[] {
  return readdirSync(thuMuc, { withFileTypes: true }).flatMap((e) => {
    const duong = join(thuMuc, e.name);
    if (e.isDirectory()) return allFiles(duong);
    return e.name.endsWith('.tsx') ? [duong] : [];
  });
}

/**
 * Mọi component gọi Server Action đều phải bắt lỗi.
 *
 * Không bắt thì lỗi thành unhandled rejection và làm sập cả trang — người dùng
 * mất luôn những gì đang gõ dở. Đây từng xảy ra thật với nút xóa buổi đánh,
 * nút sửa kỳ và nút tạo kỳ: cả ba gọi action mà không có một khối catch nào.
 */
describe('mọi nơi gọi Server Action đều bắt lỗi', () => {
  const tep = [
    ...allFiles(join(GOC, 'components')),
    ...allFiles(join(GOC, 'app')).filter((f) => !f.includes('/actions/')),
  ];

  const goiAction = tep.filter((f) => {
    const nguon = readFileSync(f, 'utf8');
    return /from ['"][^'"]*app\/actions\//.test(nguon);
  });

  it('tìm thấy component có gọi Server Action', () => {
    expect(goiAction.length).toBeGreaterThan(0);
  });

  for (const f of goiAction) {
    const ten = f.replace(GOC + '/', '');
    it(`${ten} có bắt lỗi`, () => {
      const nguon = readFileSync(f, 'utf8');
      // Hoặc tự bắt, hoặc chỉ nhận action qua prop rồi để nơi khác bắt
      // (ví dụ Navbar chỉ mở modal, modal mới gọi action).
      expect(nguon.includes('catch')).toBe(true);
    });
  }
});
