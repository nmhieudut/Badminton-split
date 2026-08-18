import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

/** Walk recursively so components in subfolders are covered too. */
function allFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return allFiles(path);
    return e.name.endsWith('.tsx') ? [path] : [];
  });
}

/**
 * Every component calling a Server Action has to catch.
 *
 * Without a catch the rejection becomes an unhandled promise rejection and
 * takes the whole page down, losing whatever the user had typed. That happened
 * for real: deleting a session, editing a period and creating one all called an
 * action with no catch anywhere in the chain.
 */
describe('mọi nơi gọi Server Action đều bắt lỗi', () => {
  const files = [
    ...allFiles(join(ROOT, 'components')),
    ...allFiles(join(ROOT, 'app')).filter((f) => !f.includes('/actions/')),
  ];

  const callSites = files.filter((f) => {
    const source = readFileSync(f, 'utf8');
    return /from ['"][^'"]*app\/actions\//.test(source);
  });

  it('tìm thấy component có gọi Server Action', () => {
    expect(callSites.length).toBeGreaterThan(0);
  });

  for (const f of callSites) {
    const name = f.replace(ROOT + '/', '');
    it(`${name} có bắt lỗi`, () => {
      const source = readFileSync(f, 'utf8');
      // Either it catches itself, or it only receives the action through a prop
      // and something else catches (Navbar just opens a modal, for example).
      expect(source.includes('catch')).toBe(true);
    });
  }
});
