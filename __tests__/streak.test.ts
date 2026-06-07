import { describe, it, expect } from 'vitest';
import { updateStreak, dayDiff, toLocalDateKey } from '../lib/streak';
import type { Streak } from '../store/types';

describe('dayDiff', () => {
  it('computes calendar-day differences', () => {
    expect(dayDiff('2026-06-05', '2026-06-06')).toBe(1);
    expect(dayDiff('2026-06-05', '2026-06-05')).toBe(0);
    expect(dayDiff('2026-06-05', '2026-06-08')).toBe(3);
    expect(dayDiff('2026-06-30', '2026-07-01')).toBe(1); // month boundary
    expect(dayDiff('2026-02-28', '2026-03-01')).toBe(1); // 2026 not a leap year
  });
});

describe('toLocalDateKey', () => {
  it('formats a Date to YYYY-MM-DD local', () => {
    expect(toLocalDateKey(new Date(2026, 5, 5))).toBe('2026-06-05'); // month is 0-based
    expect(toLocalDateKey(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('updateStreak', () => {
  it('starts a streak from null', () => {
    expect(updateStreak(null, '2026-06-05')).toEqual({
      current: 1,
      longest: 1,
      lastNightDate: '2026-06-05',
    });
  });

  it('increments on consecutive nights and tracks longest', () => {
    let s: Streak | null = null;
    s = updateStreak(s, '2026-06-05');
    s = updateStreak(s, '2026-06-06');
    s = updateStreak(s, '2026-06-07');
    expect(s).toEqual({ current: 3, longest: 3, lastNightDate: '2026-06-07' });
  });

  it('holds steady (no double count) when recording twice on the same day', () => {
    const prev: Streak = { current: 4, longest: 9, lastNightDate: '2026-06-05' };
    expect(updateStreak(prev, '2026-06-05')).toBe(prev);
  });

  it('resets current but preserves longest after a gap', () => {
    const prev: Streak = { current: 5, longest: 5, lastNightDate: '2026-06-05' };
    const next = updateStreak(prev, '2026-06-08'); // 3-day gap
    expect(next).toEqual({ current: 1, longest: 5, lastNightDate: '2026-06-08' });
  });

  it('does not raise longest below an existing record after reset', () => {
    const prev: Streak = { current: 2, longest: 10, lastNightDate: '2026-06-05' };
    const next = updateStreak(prev, '2026-06-10');
    expect(next.longest).toBe(10);
    expect(next.current).toBe(1);
  });
});
