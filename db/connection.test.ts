import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Production ran out of database connections: "(EMAXCONN) max client
 * connections reached, limit: 200", and every page and action failed once it
 * hit the ceiling.
 *
 * The cause was a caching guard that read `NODE_ENV !== 'production'`, so the
 * pool was reused everywhere EXCEPT the place it mattered. Combined with `db`
 * being a Proxy that calls the factory on every property access, a single
 * request opened a fresh pool for select, another for insert, another for
 * transaction — until the pooler refused new clients.
 *
 * These tests count how many pools get opened, which is the thing that broke.
 */

const created: unknown[] = [];

vi.mock('postgres', () => ({
  default: vi.fn(() => {
    const client = { __pool: created.length };
    created.push(client);
    return client;
  }),
}));

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn((client: unknown) => ({ __client: client, select: () => 'select', insert: () => 'insert' })),
}));

const g = globalThis as Record<string, unknown>;

beforeEach(() => {
  created.length = 0;
  delete g.client;
  delete g.db;
  vi.resetModules();
  process.env.DATABASE_URL = 'postgres://user:pw@localhost:6543/postgres';
});

afterEach(() => {
  delete g.client;
  delete g.db;
});

describe('kết nối cơ sở dữ liệu', () => {
  it('CHỈ mở một pool dù truy cập db nhiều lần — kể cả ở production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { db } = await import('./index');

    // The Proxy calls the factory on every property read; this is the exact
    // access pattern of a single request touching several tables.
    void db.select;
    void db.insert;
    void db.select;
    void db.transaction;

    expect(created).toHaveLength(1);
    vi.unstubAllEnvs();
  });

  it('ở development cũng chỉ một pool', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { db } = await import('./index');
    void db.select;
    void db.insert;
    void db.select;
    expect(created).toHaveLength(1);
    vi.unstubAllEnvs();
  });

  it('giữ pool đủ lớn — pool cạn thì postgres.js treo chứ không xếp hàng', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const postgres = (await import('postgres')).default as unknown as ReturnType<typeof vi.fn>;
    const { db } = await import('./index');
    void db.select;

    const opts = postgres.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.prepare).toBe(false); // bắt buộc với transaction pooler
    // Đo thực tế trên pooler này: max=1 treo ở 5 query song song, max=3 treo ở
    // 20, max=10 xử lý 20 trong ~1 giây. Layout chạy query song song nên hạ
    // con số này sẽ làm treo cả app.
    expect(opts.max as number).toBeGreaterThanOrEqual(10);
    expect(typeof opts.idle_timeout).toBe('number');
    vi.unstubAllEnvs();
  });

  it('thiếu DATABASE_URL thì báo lỗi cấu hình, không mở pool', async () => {
    delete process.env.DATABASE_URL;
    const { db } = await import('./index');
    expect(() => db.select).toThrow();
    expect(created).toHaveLength(0);
  });
});
