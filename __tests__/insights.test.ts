import { describe, it, expect } from 'vitest';
import {
  buildTrendSeries,
  computeRemedyEffects,
  computeScoreDelta,
  summarizeNight,
} from '../lib/insights';
import { toLocalDateKey } from '../lib/streak';
import type { ClassificationEvent } from '../store/types';

const cev = (over: Partial<ClassificationEvent>): ClassificationEvent => ({
  id: 'e',
  sessionId: 'S',
  label: 'snoring',
  startSec: 0,
  endSec: 10,
  peakDb: -20,
  confidence: 0.9,
  ...over,
});

const sess = (id: string, day: number, score: number) => ({
  id,
  startedAt: new Date(2026, 5, day, 23, 0).getTime(), // 2026-06-<day> 23:00
  nightlyScore: score,
});

describe('buildTrendSeries', () => {
  it('returns oldest→newest, limited to the last N sessions', () => {
    const sessions = [sess('c', 3, 30), sess('a', 1, 50), sess('b', 2, 40), sess('d', 4, 20)];
    const out = buildTrendSeries(sessions, toLocalDateKey, 3);
    expect(out.map((p) => p.sessionId)).toEqual(['b', 'c', 'd']);
    expect(out.map((p) => p.score)).toEqual([40, 30, 20]);
    expect(out[0].date).toBe('2026-06-02');
  });

  it('handles empty input', () => {
    expect(buildTrendSeries([], toLocalDateKey)).toEqual([]);
  });
});

describe('computeRemedyEffects', () => {
  it('computes with/without averages and delta (negative = improving)', () => {
    const sessions = [sess('a', 1, 60), sess('b', 2, 20), sess('c', 3, 30), sess('d', 4, 70)];
    const tags = [
      { sessionId: 'b', remedyId: 'side-sleep' },
      { sessionId: 'c', remedyId: 'side-sleep' },
    ];
    const out = computeRemedyEffects(sessions, tags);
    expect(out).toHaveLength(1);
    const e = out[0];
    expect(e.remedyId).toBe('side-sleep');
    expect(e.nightsWith).toBe(2);
    expect(e.nightsWithout).toBe(2);
    expect(e.avgWith).toBe(25); // (20+30)/2
    expect(e.avgWithout).toBe(65); // (60+70)/2
    expect(e.delta).toBe(-40); // 効いてる兆し
  });

  it('skips remedies without a comparison group (all nights tagged)', () => {
    const sessions = [sess('a', 1, 10), sess('b', 2, 20)];
    const tags = [
      { sessionId: 'a', remedyId: 'pillow' },
      { sessionId: 'b', remedyId: 'pillow' },
    ];
    expect(computeRemedyEffects(sessions, tags)).toEqual([]);
  });

  it('sorts by delta ascending (most effective first)', () => {
    const sessions = [sess('a', 1, 100), sess('b', 2, 10), sess('c', 3, 90)];
    const tags = [
      { sessionId: 'b', remedyId: 'good-one' }, // with=10, without=95, delta=-85
      { sessionId: 'c', remedyId: 'meh-one' }, // with=90, without=55, delta=+35
    ];
    const out = computeRemedyEffects(sessions, tags);
    expect(out.map((e) => e.remedyId)).toEqual(['good-one', 'meh-one']);
  });
});

describe('computeScoreDelta', () => {
  it('no prior nights → all null, sampleCount 0', () => {
    const r = computeScoreDelta(30, []);
    expect(r).toEqual({ prevScore: null, avgScore: null, deltaPrev: null, sampleCount: 0 });
  });

  it('negative deltaPrev means quieter than last night', () => {
    const r = computeScoreDelta(20, [35, 40, 30]); // prev = 35 (newest first)
    expect(r.prevScore).toBe(35);
    expect(r.deltaPrev).toBe(-15);
    expect(r.avgScore).toBe(35); // (35+40+30)/3
    expect(r.sampleCount).toBe(3);
  });

  it('positive deltaPrev means louder than last night', () => {
    const r = computeScoreDelta(50, [30]);
    expect(r.deltaPrev).toBe(20);
  });
});

describe('summarizeNight', () => {
  it('no snoring → whole night is the quiet stretch, no peak', () => {
    const r = summarizeNight([cev({ label: 'ambient' })], 8 * 3600);
    expect(r.peakStartSec).toBeNull();
    expect(r.peakSnoreSec).toBe(0);
    expect(r.longestQuietMin).toBe(480);
  });

  it('finds the loudest hour and the longest quiet gap', () => {
    const r = summarizeNight(
      [
        cev({ startSec: 600, endSec: 660 }), // 1st hour: 60s
        cev({ startSec: 3700, endSec: 4600 }), // 2nd hour: 900s ← peak
      ],
      4 * 3600
    );
    expect(r.peakStartSec).toBe(3600); // hour bin 1
    expect(r.peakSnoreSec).toBe(900);
    // longest quiet = trailing gap 4*3600 - 4600 = 9800s ≈ 163min
    expect(r.longestQuietMin).toBe(Math.round((4 * 3600 - 4600) / 60));
  });
});
