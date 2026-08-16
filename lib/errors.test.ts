import { describe, expect, it, vi } from 'vitest';
import { ConfigError } from './errors';

describe('ConfigError', () => {
  it('không để lộ chi tiết cấu hình ra thông báo người dùng thấy', () => {
    const loi = new ConfigError('Thiếu biến môi trường DATABASE_URL');

    expect(loi.message).not.toContain('DATABASE_URL');
    expect(loi.message).not.toMatch(/env|\.env|Vercel|Supabase|postgres/i);
  });

  it('đưa ra một câu chung, đọc được, không đổ lỗi cho người dùng', () => {
    const loi = new ConfigError('bất kỳ chi tiết nội bộ nào');
    expect(loi.message).toBe('Hệ thống đang trục trặc. Vui lòng thử lại sau ít phút.');
  });

  it('ghi chi tiết vào log của server để người vận hành đọc', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    new ConfigError('Thiếu SUPABASE_SERVICE_ROLE_KEY');

    expect(spy).toHaveBeenCalledWith('[cấu hình] Thiếu SUPABASE_SERVICE_ROLE_KEY');
    spy.mockRestore();
  });
});
