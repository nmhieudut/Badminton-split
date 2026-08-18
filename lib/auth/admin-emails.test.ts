import { afterEach, describe, expect, it } from 'vitest';
import { isSuperAdminEmail } from './admin-emails';

const setEnv = (v: string | undefined) => {
  if (v === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = v;
};

afterEach(() => setEnv(undefined));

describe('isSuperAdminEmail', () => {
  it('nhận đúng email có trong danh sách', () => {
    setEnv('a@gmail.com,b@gmail.com');
    expect(isSuperAdminEmail('a@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('b@gmail.com')).toBe(true);
  });

  it('từ chối email ngoài danh sách', () => {
    setEnv('a@gmail.com');
    expect(isSuperAdminEmail('c@gmail.com')).toBe(false);
  });

  it('bỏ qua chữ hoa chữ thường', () => {
    setEnv('Admin@Gmail.com');
    expect(isSuperAdminEmail('admin@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('ADMIN@GMAIL.COM')).toBe(true);
  });

  it('bỏ qua khoảng trắng thừa quanh dấu phẩy', () => {
    setEnv('  a@gmail.com ,  b@gmail.com  ');
    expect(isSuperAdminEmail('a@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('b@gmail.com')).toBe(true);
  });

  it('biến môi trường để trống thì không ai là super admin', () => {
    setEnv('');
    expect(isSuperAdminEmail('a@gmail.com')).toBe(false);
  });

  it('biến môi trường không khai báo thì không ai là super admin', () => {
    setEnv(undefined);
    expect(isSuperAdminEmail('a@gmail.com')).toBe(false);
  });

  it('email rỗng hoặc null không bao giờ là super admin', () => {
    setEnv('a@gmail.com,');
    expect(isSuperAdminEmail('')).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
  });

  it('không khớp một phần — email gần giống vẫn bị từ chối', () => {
    setEnv('admin@gmail.com');
    expect(isSuperAdminEmail('admin@gmail.com.vn')).toBe(false);
    expect(isSuperAdminEmail('xadmin@gmail.com')).toBe(false);
  });
});
