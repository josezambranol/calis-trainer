import { describe, expect, it } from 'vitest';
import { DAYS_MAP, getCurrentDayOfWeek } from './routineGenerator';

describe('routineGenerator utilities', () => {
  it('provides all 7 Spanish weekday descriptors in canonical order', () => {
    expect(DAYS_MAP).toHaveLength(7);
    expect(DAYS_MAP[0].id).toBe('lunes');
    expect(DAYS_MAP[6].id).toBe('domingo');
  });

  it('resolves current day of week to a valid DayOfWeek id', () => {
    const today = getCurrentDayOfWeek();
    expect(DAYS_MAP.map((d) => d.id)).toContain(today);
  });
});
