import { afterEach, describe, expect, it } from 'vitest';
import { laEmailAdmin } from './admin-emails';

const datBien = (v: string | undefined) => {
  if (v === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = v;
};

afterEach(() => datBien(undefined));

describe('laEmailAdmin', () => {
  it('nhận đúng email có trong danh sách', () => {
    datBien('a@gmail.com,b@gmail.com');
    expect(laEmailAdmin('a@gmail.com')).toBe(true);
    expect(laEmailAdmin('b@gmail.com')).toBe(true);
  });

  it('từ chối email ngoài danh sách', () => {
    datBien('a@gmail.com');
    expect(laEmailAdmin('c@gmail.com')).toBe(false);
  });

  it('bỏ qua chữ hoa chữ thường', () => {
    datBien('Admin@Gmail.com');
    expect(laEmailAdmin('admin@gmail.com')).toBe(true);
    expect(laEmailAdmin('ADMIN@GMAIL.COM')).toBe(true);
  });

  it('bỏ qua khoảng trắng thừa quanh dấu phẩy', () => {
    datBien('  a@gmail.com ,  b@gmail.com  ');
    expect(laEmailAdmin('a@gmail.com')).toBe(true);
    expect(laEmailAdmin('b@gmail.com')).toBe(true);
  });

  it('biến môi trường để trống thì không ai là super admin', () => {
    datBien('');
    expect(laEmailAdmin('a@gmail.com')).toBe(false);
  });

  it('biến môi trường không khai báo thì không ai là super admin', () => {
    datBien(undefined);
    expect(laEmailAdmin('a@gmail.com')).toBe(false);
  });

  it('email rỗng hoặc null không bao giờ là super admin', () => {
    datBien('a@gmail.com,');
    expect(laEmailAdmin('')).toBe(false);
    expect(laEmailAdmin(null)).toBe(false);
    expect(laEmailAdmin(undefined)).toBe(false);
  });

  it('không khớp một phần — email gần giống vẫn bị từ chối', () => {
    datBien('admin@gmail.com');
    expect(laEmailAdmin('admin@gmail.com.vn')).toBe(false);
    expect(laEmailAdmin('xadmin@gmail.com')).toBe(false);
  });
});
