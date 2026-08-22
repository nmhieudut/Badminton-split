import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ACTIONS_DIR = join(process.cwd(), 'app/actions');

/**
 * auth.ts is exempt: the two actions in it serve signing in itself, and someone
 * who is not signed in cannot be an admin.
 */
const EXEMPT_FILES = new Set(['auth.ts']);

/** Files where every action inside MUST use requireSuperAdmin(). */
const SUPER_ADMIN_ONLY_FILES = new Set(['admins.ts']);

/**
 * Actions that are DELIBERATELY open to everyone, guests included.
 *
 * This list must stay very short, and every entry must state its reason. Its
 * purpose is not to make dropping a guard easy, but to turn dropping a guard
 * into a named decision that someone wrote down — instead of a line of code
 * quietly deleted.
 */
const PUBLIC_ACTIONS = new Map<string, string>([
  [
    'settlement.ts → recordPayment',
    'Người vừa chuyển tiền tự tích; bắt đăng nhập chỉ để bấm một nút là rào cản lớn hơn giá trị nó bảo vệ. Mọi lần ghi đều hiện trên trang lịch sử nên sai là thấy ngay.',
  ],
  [
    'settlement.ts → undoLastPayment',
    'Hoàn tác cú bấm nhầm của chính người vừa ghi; họ thường không phải admin, bắt đi nhờ người khác gỡ còn tệ hơn rủi ro.',
  ],
  [
    'client-error.ts → reportClientError',
    'Ghi lỗi crash phía client lên log server. Khách cũng crash nên không thể bắt đăng nhập; chỉ ghi một dòng log đã cắt ngắn, không ghi DB.',
  ],
  [
    'qr-upload.ts → uploadQrViaLink',
    'Thành viên tự tải QR qua link mà không cần tài khoản. Quyền nằm ở chính token: không đoán được, gắn một người, có hạn, dùng một lần.',
  ],
]);

/**
 * Extract the body of a function.
 *
 * The parameter list has to be walked through first, and only then do we look
 * for the `{` that opens the body. Taking the first `{` after the function name
 * is wrong for functions with an object-typed parameter — such as
 * `updateMonth(id, fields: { title?: string })` — because it would cut into the
 * parameter type and miss the real body entirely.
 */
function functionBody(source: string, functionName: string): string {
  const start = source.indexOf(`export async function ${functionName}`);
  if (start === -1) return '';

  // Walk the parameter list, counting parentheses until they all close.
  const parenStart = source.indexOf('(', start);
  let openParens = 0;
  let i = parenStart;
  for (; i < source.length; i += 1) {
    if (source[i] === '(') openParens += 1;
    if (source[i] === ')') {
      openParens -= 1;
      if (openParens === 0) break;
    }
  }

  const bodyStart = source.indexOf('{', i);
  if (bodyStart === -1) return '';

  let openBraces = 0;
  for (let j = bodyStart; j < source.length; j += 1) {
    if (source[j] === '{') openBraces += 1;
    if (source[j] === '}') {
      openBraces -= 1;
      if (openBraces === 0) return source.slice(bodyStart, j + 1);
    }
  }
  return source.slice(bodyStart);
}

describe('mọi Server Action ghi dữ liệu đều có chốt chặn', () => {
  const filesToCheck = readdirSync(ACTIONS_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .filter((f) => !EXEMPT_FILES.has(f));

  it('tìm thấy các tệp action để kiểm', () => {
    expect(filesToCheck.length).toBeGreaterThan(0);
  });

  for (const file of filesToCheck) {
    const source = readFileSync(join(ACTIONS_DIR, file), 'utf8');
    const functionNames = [...source.matchAll(/export async function (\w+)/g)].map((m) => m[1]);

    it(`${file} có ít nhất một action`, () => {
      expect(functionNames.length).toBeGreaterThan(0);
    });

    const superAdminOnly = SUPER_ADMIN_ONLY_FILES.has(file);

    for (const name of functionNames) {
      const key = `${file} → ${name}`;

      if (PUBLIC_ACTIONS.has(key)) {
        it(`${key}() được khai báo là công khai, kèm lý do`, () => {
          // The guard is not checked here, but a written reason is mandatory.
          expect(PUBLIC_ACTIONS.get(key)!.length).toBeGreaterThan(20);
        });
        continue;
      }

      it(`${file} → ${name}() có chốt chặn`, () => {
        const body = functionBody(source, name);
        expect(
          body.includes('requireAdmin()') || body.includes('requireSuperAdmin()')
        ).toBe(true);
      });

      if (superAdminOnly) {
        // Checked separately, because the "has some guard" assertion above stays
        // green when someone downgrades requireSuperAdmin() to requireAdmin() —
        // which is exactly the mistake that erases the boundary between the two
        // permission groups.
        it(`${file} → ${name}() dùng đúng requireSuperAdmin()`, () => {
          expect(functionBody(source, name)).toContain('requireSuperAdmin()');
        });
      }
    }
  }
});
