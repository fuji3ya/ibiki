import { describe, it, expect } from 'vitest';
import { buildTrendSeries, computeRemedyEffects } from '../lib/insights';
import { toLocalDateKey } from '../lib/streak';

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
