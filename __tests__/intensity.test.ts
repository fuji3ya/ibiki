import { describe, it, expect } from 'vitest';
import {
  computeIntensityBreakdown,
  tierForDb,
  TIER_ORDER,
} from '../lib/intensity';
import type { ClassificationEvent } from '../store/types';

const ev = (over: Partial<ClassificationEvent>): ClassificationEvent => ({
  id: 'e',
  sessionId: 'S',
  label: 'snoring',
  startSec: 0,
  endSec: 10,
  peakDb: -20,
  confidence: 0.9,
  ...over,
});

describe('tierForDb', () => {
  it('maps dBFS to the 4 tiers at the documented thresholds', () => {
    expect(tierForDb(-5)).toBe('epic'); // >= -14
    expect(tierForDb(-14)).toBe('epic');
    expect(tierForDb(-18)).toBe('loud'); // -22..-14
    expect(tierForDb(-22)).toBe('loud');
    expect(tierForDb(-26)).toBe('light'); // -30..-22
    expect(tierForDb(-30)).toBe('light');
    expect(tierForDb(-40)).toBe('quiet'); // < -30
  });
});

describe('computeIntensityBreakdown', () => {
  it('no snoring → all zero, dominant null, slices length 4', () => {
    const r = computeIntensityBreakdown([ev({ label: 'ambient' }), ev({ label: 'sleep_talk' })]);
    expect(r.totalSec).toBe(0);
    expect(r.dominant).toBeNull();
    expect(r.slices).toHaveLength(4);
    expect(r.slices.every((s) => s.sec === 0 && s.pct === 0)).toBe(true);
    expect(r.slices.map((s) => s.tier)).toEqual(TIER_ORDER);
  });

  it('buckets snoring seconds by loudness and computes percentages', () => {
    const r = computeIntensityBreakdown([
      ev({ startSec: 0, endSec: 60, peakDb: -40 }), // quiet 60s
      ev({ startSec: 100, endSec: 160, peakDb: -26 }), // light 60s
      ev({ startSec: 200, endSec: 260, peakDb: -10 }), // epic 60s
    ]);
    expect(r.totalSec).toBe(180);
    const byTier = Object.fromEntries(r.slices.map((s) => [s.tier, s.sec]));
    expect(byTier.quiet).toBe(60);
    expect(byTier.light).toBe(60);
    expect(byTier.loud).toBe(0);
    expect(byTier.epic).toBe(60);
    const epicPct = r.slices.find((s) => s.tier === 'epic')!.pct;
    expect(epicPct).toBeCloseTo(33.33, 1);
  });

  it('dominant tier = the one with the most seconds', () => {
    const r = computeIntensityBreakdown([
      ev({ startSec: 0, endSec: 30, peakDb: -40 }), // quiet 30s
      ev({ startSec: 100, endSec: 400, peakDb: -18 }), // loud 300s
    ]);
    expect(r.dominant).toBe('loud');
  });

  it('only counts snoring events (ignores other labels)', () => {
    const r = computeIntensityBreakdown([
      ev({ startSec: 0, endSec: 100, peakDb: -10, label: 'sleep_talk' }),
      ev({ startSec: 100, endSec: 130, peakDb: -10, label: 'snoring' }),
    ]);
    expect(r.totalSec).toBe(30);
    expect(r.dominant).toBe('epic');
  });
});
