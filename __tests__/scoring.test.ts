import { describe, it, expect } from 'vitest';
import { computeNightlyScore } from '../lib/scoring';
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

describe('computeNightlyScore', () => {
  it('a quiet night (no snoring) scores high and reads as quiet, no medical wording', () => {
    const r = computeNightlyScore({ durationSec: 28800, events: [] });
    expect(r.score).toBe(100);
    expect(r.snoringSec).toBe(0);
    expect(r.peakDb).toBe(-120);
    expect(r.reason).toContain('静か');
    expect(r.reason).not.toMatch(/無呼吸|診断|検出|病/);
  });

  it('heavy + loud snoring scores much lower than light snoring', () => {
    const heavy = computeNightlyScore({
      durationSec: 1000,
      events: [ev({ startSec: 0, endSec: 600, peakDb: -8 })], // 60% of night, loud
    });
    const light = computeNightlyScore({
      durationSec: 1000,
      events: [ev({ startSec: 0, endSec: 30, peakDb: -30 })], // 3% of night, quiet
    });
    expect(heavy.score).toBeLessThan(light.score);
    expect(heavy.score).toBeGreaterThanOrEqual(0);
    expect(light.score).toBeLessThanOrEqual(100);
  });

  it('reason reflects the actual snoring percentage', () => {
    const r = computeNightlyScore({
      durationSec: 1000,
      events: [ev({ startSec: 0, endSec: 500, peakDb: -10 })], // 50%
    });
    expect(r.snoringRatio).toBeCloseTo(0.5, 5);
    expect(r.reason).toContain('50%');
  });

  it('only snoring events count toward snoringSec (sleep_talk ignored)', () => {
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

  it('clamps score to [0,100] and never divides by zero on 0 duration', () => {
    const r = computeNightlyScore({
      durationSec: 0,
      events: [ev({ startSec: 0, endSec: 100, peakDb: -5 })],
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
