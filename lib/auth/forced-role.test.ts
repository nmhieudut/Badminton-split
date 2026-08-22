import { describe, expect, it } from 'vitest';
import { forcedRoleForLocalTesting } from './session';

describe('E2E_ROLE — ép vai trò khi thử nghiệm ở máy dev', () => {
  it('không can thiệp khi biến không được đặt', () => {
    expect(forcedRoleForLocalTesting({})).toBeUndefined();
    expect(forcedRoleForLocalTesting({ NODE_ENV: 'development' })).toBeUndefined();
  });

  it('ép được admin và super_admin ở development', () => {
    expect(forcedRoleForLocalTesting({ NODE_ENV: 'development', E2E_ROLE: 'admin' })).toBe('admin');
    expect(forcedRoleForLocalTesting({ NODE_ENV: 'test', E2E_ROLE: 'super_admin' })).toBe(
      'super_admin'
    );
  });

  it('TUYỆT ĐỐI bị bỏ qua ở production, kể cả khi biến được đặt', () => {
    expect(
      forcedRoleForLocalTesting({ NODE_ENV: 'production', E2E_ROLE: 'super_admin' })
    ).toBeUndefined();
    expect(forcedRoleForLocalTesting({ NODE_ENV: 'production', E2E_ROLE: 'admin' })).toBeUndefined();
  });

  it('giá trị lạ thì thành khách, không thành admin', () => {
    expect(forcedRoleForLocalTesting({ NODE_ENV: 'development', E2E_ROLE: 'root' })).toBeNull();
  });
});
