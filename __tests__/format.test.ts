import { describe, it, expect } from 'vitest';
import { formatDurationJa, formatElapsed, dbToMeter } from '../lib/format';

describe('formatDurationJa', () => {
  it('formats hours+minutes / minutes / seconds', () => {
    expect(formatDurationJa(7 * 3600 + 32 * 60)).toBe('7時間32分');
    expect(formatDurationJa(32 * 60)).toBe('32分');
    expect(formatDurationJa(45)).toBe('45秒');
    expect(formatDurationJa(-10)).toBe('0秒');
  });
});

describe('formatElapsed', () => {
  it('formats H:MM:SS', () => {
    expect(formatElapsed(0)).toBe('0:00:00');
    expect(formatElapsed(7 * 3600 + 5 * 60 + 9)).toBe('7:05:09');
  });
});

describe('dbToMeter', () => {
  it('maps dBFS to 0..1 with a -60dB floor', () => {
    expect(dbToMeter(0)).toBe(1);
    expect(dbToMeter(-60)).toBe(0);
    expect(dbToMeter(-30)).toBeCloseTo(0.5, 5);
    expect(dbToMeter(-120)).toBe(0); // clamped
  });
});
