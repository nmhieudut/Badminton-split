import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execute = vi.fn();
vi.mock('../../../db', () => ({ db: { execute: (...a: unknown[]) => execute(...a) } }));

import { GET } from './route';

const call = (auth?: string) =>
  GET(new Request('https://x/api/keep-alive', { headers: auth ? { authorization: auth } : {} }));

describe('keep-alive — giữ Supabase không bị tạm dừng', () => {
  beforeEach(() => {
    execute.mockReset();
    execute.mockResolvedValue([{ '?column?': 1 }]);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('chạy truy vấn khi đúng secret của Vercel Cron', async () => {
    vi.stubEnv('CRON_SECRET', 'bi-mat');
    const res = await call('Bearer bi-mat');
    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('từ chối khi không có hoặc sai secret, và không đụng DB', async () => {
    vi.stubEnv('CRON_SECRET', 'bi-mat');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer sai')).status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it('chưa cấu hình secret thì từ chối tất cả, không mở toang', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer ')).status).toBe(401);
    expect((await call('Bearer undefined')).status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it('DB lỗi thì trả 500 để lần chạy cron hiện là thất bại', async () => {
    vi.stubEnv('CRON_SECRET', 'bi-mat');
    execute.mockRejectedValue(new Error('tenant not found'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await call('Bearer bi-mat')).status).toBe(500);
  });
});
