import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const THU_MUC = join(process.cwd(), 'app/actions');

/**
 * auth.ts được miễn: hai action trong đó phục vụ chính việc đăng nhập, chưa
 * đăng nhập thì không thể là admin.
 */
const MIEN_TRU = new Set(['auth.ts']);

/** Các tệp mà mọi action bên trong BẮT BUỘC phải là requireSuperAdmin(). */
const CHI_SUPER_ADMIN = new Set(['admins.ts']);

/**
 * Cắt lấy thân của một hàm.
 *
 * Phải đi hết danh sách tham số trước rồi mới tìm dấu `{` của thân hàm. Lấy
 * ngay dấu `{` đầu tiên sau tên hàm là sai với những hàm có tham số kiểu
 * object — như `updateMonth(id, fields: { title?: string })` — vì khi đó nó
 * cắt trúng kiểu tham số và bỏ sót cả thân hàm thật.
 */
function layThanHam(nguon: string, tenHam: string): string {
  const bd = nguon.indexOf(`export async function ${tenHam}`);
  if (bd === -1) return '';

  // Đi qua danh sách tham số, đếm ngoặc tròn cho tới khi đóng hết.
  const moTron = nguon.indexOf('(', bd);
  let sauTron = 0;
  let i = moTron;
  for (; i < nguon.length; i += 1) {
    if (nguon[i] === '(') sauTron += 1;
    if (nguon[i] === ')') {
      sauTron -= 1;
      if (sauTron === 0) break;
    }
  }

  const moNgoac = nguon.indexOf('{', i);
  if (moNgoac === -1) return '';

  let sau = 0;
  for (let j = moNgoac; j < nguon.length; j += 1) {
    if (nguon[j] === '{') sau += 1;
    if (nguon[j] === '}') {
      sau -= 1;
      if (sau === 0) return nguon.slice(moNgoac, j + 1);
    }
  }
  return nguon.slice(moNgoac);
}

describe('mọi Server Action ghi dữ liệu đều có chốt chặn', () => {
  const tepCanKiem = readdirSync(THU_MUC)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .filter((f) => !MIEN_TRU.has(f));

  it('tìm thấy các tệp action để kiểm', () => {
    expect(tepCanKiem.length).toBeGreaterThan(0);
  });

  for (const tep of tepCanKiem) {
    const nguon = readFileSync(join(THU_MUC, tep), 'utf8');
    const tenHam = [...nguon.matchAll(/export async function (\w+)/g)].map((m) => m[1]);

    it(`${tep} có ít nhất một action`, () => {
      expect(tenHam.length).toBeGreaterThan(0);
    });

    const chiSuperAdmin = CHI_SUPER_ADMIN.has(tep);

    for (const ten of tenHam) {
      it(`${tep} → ${ten}() có chốt chặn`, () => {
        const than = layThanHam(nguon, ten);
        expect(
          than.includes('requireAdmin()') || than.includes('requireSuperAdmin()')
        ).toBe(true);
      });

      if (chiSuperAdmin) {
        // Kiểm riêng, vì phép kiểm "có chốt chặn nào đó" ở trên vẫn xanh khi ai
        // đó hạ requireSuperAdmin() xuống requireAdmin() — mà đó chính là lỗi
        // xóa mất ranh giới giữa hai nhóm quyền.
        it(`${tep} → ${ten}() dùng đúng requireSuperAdmin()`, () => {
          expect(layThanHam(nguon, ten)).toContain('requireSuperAdmin()');
        });
      }
    }
  }
});
