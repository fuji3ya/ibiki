import { describe, it, expect } from 'vitest';
import { computeNightlyScore, dbToIntensity, scoreBand, scoreBandLabel } from '../lib/scoring';
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

describe('dbToIntensity', () => {
  it('maps dBFS to 0..1 with a -60dB floor', () => {
    expect(dbToIntensity(0)).toBe(1);
    expect(dbToIntensity(-60)).toBe(0);
    expect(dbToIntensity(-30)).toBeCloseTo(0.5, 5);
    expect(dbToIntensity(-120)).toBe(0);
  });
});

describe('computeNightlyScore — いびきスコア (低いほど良い・SnoreLab語彙)', () => {
  it('a quiet night (no snoring) scores 0, no medical wording', () => {
    const r = computeNightlyScore({ durationSec: 28800, events: [] });
    expect(r.score).toBe(0);
    expect(r.snoringSec).toBe(0);
    expect(r.peakDb).toBe(-120);
    expect(r.avgIntensity).toBe(0);
    expect(r.reason).toContain('静か');
    expect(r.reason).not.toMatch(/無呼吸|診断|検出|病/);
  });

  it('score = avg intensity x snoring minutes (typical night lands near 25)', () => {
    // 1時間のいびき、音圧 -36dB (= intensity 0.4) → 0.4 * 60 = 24
    const r = computeNightlyScore({
      durationSec: 8 * 3600,
      events: [ev({ startSec: 0, endSec: 3600, peakDb: -36 })],
    });
    expect(r.score).toBe(24);
    expect(r.avgIntensity).toBeCloseTo(0.4, 5);
  });

  it('heavy loud snoring scores HIGHER than light snoring (worse = bigger)', () => {
    const heavy = computeNightlyScore({
      durationSec: 8 * 3600,
      events: [ev({ startSec: 0, endSec: 3 * 3600, peakDb: -6 })], // 3h, 0.9
    });
    const light = computeNightlyScore({
      durationSec: 8 * 3600,
      events: [ev({ startSec: 0, endSec: 600, peakDb: -45 })], // 10min, 0.25
    });
    expect(heavy.score).toBeGreaterThan(light.score);
    expect(heavy.score).toBeGreaterThan(100); // SnoreLab同様 100 超あり得る (0.9*180=162)
    expect(light.score).toBeLessThan(10);
  });

  it('weights intensity by event duration', () => {
    // 10min @ -60dB(0) + 50min @ -30dB(0.5) → avg = (0*600+0.5*3000)/3600 = 0.4166..
    const r = computeNightlyScore({
      durationSec: 8 * 3600,
      events: [
        ev({ id: 'a', startSec: 0, endSec: 600, peakDb: -60 }),
        ev({ id: 'b', startSec: 600, endSec: 3600, peakDb: -30 }),
      ],
    });
    expect(r.avgIntensity).toBeCloseTo(0.4167, 3);
    expect(r.score).toBe(25); // 0.4167 * 60min
  });

  it('only snoring events count (sleep_talk/ambient ignored)', () => {
    const r = computeNightlyScore({
      durationSec: 1000,
      events: [
        ev({ label: 'snoring', startSec: 0, endSec: 100 }),
        ev({ label: 'sleep_talk', startSec: 100, endSec: 300 }),
        ev({ label: 'ambient', startSec: 300, endSec: 900 }),
      ],
    });
    expect(r.snoringSec).toBe(100);
  });

  it('reason reflects the snoring percentage and never divides by zero', () => {
    const r = computeNightlyScore({
      durationSec: 1000,
      events: [ev({ startSec: 0, endSec: 500, peakDb: -10 })],
    });
    expect(r.snoringRatio).toBeCloseTo(0.5, 5);
    expect(r.reason).toContain('50%');
    const z = computeNightlyScore({ durationSec: 0, events: [ev({})] });
    expect(Number.isFinite(z.score)).toBe(true);
  });
});

describe('scoreBand / scoreBandLabel', () => {
  it('bands follow SnoreLab-style thresholds (low = good)', () => {
    expect(scoreBand(0)).toBe('good');
    expect(scoreBand(24)).toBe('good');
    expect(scoreBand(25)).toBe('warn');
    expect(scoreBand(49)).toBe('warn');
    expect(scoreBand(50)).toBe('danger');
    expect(scoreBand(150)).toBe('danger');
  });

  it('labels are calm Japanese, no medical wording', () => {
    expect(scoreBandLabel(5)).toBe('ほぼ無し');
    expect(scoreBandLabel(15)).toBe('すこし');
    expect(scoreBandLabel(30)).toBe('ふつう');
    expect(scoreBandLabel(70)).toBe('多め');
    expect(scoreBandLabel(120)).toBe('かなり多め');
  });
});
