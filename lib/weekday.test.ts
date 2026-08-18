import { describe, expect, it } from 'vitest';
import { weekdayVi } from './weekday';

describe('weekdayVi', () => {
  it('names the weekday of the dates already in the database', () => {
    expect(weekdayVi('2026-08-16')).toBe('CN');
    expect(weekdayVi('2026-08-08')).toBe('Thứ 7');
  });

  it('does not shift the date with the time zone', () => {
    // Midnight-boundary dates are where a UTC-parsed date drifts a day.
    expect(weekdayVi('2026-01-01')).toBe('Thứ 5');
    expect(weekdayVi('2025-12-31')).toBe('Thứ 4');
  });

  it('returns an empty string rather than throwing on a malformed date', () => {
    expect(weekdayVi('')).toBe('');
    expect(weekdayVi('khong-phai-ngay')).toBe('');
  });
});
