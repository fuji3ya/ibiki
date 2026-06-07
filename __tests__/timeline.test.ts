import { describe, it, expect } from 'vitest';
import { bucketizeNight } from '../lib/timeline';
import type { ClassificationEvent } from '../store/types';

const ev = (over: Partial<ClassificationEvent>): ClassificationEvent => ({
  id: 'e', sessionId: 'S', label: 'snoring', startSec: 0, endSec: 10, peakDb: -20, confidence: 0.9, ...over,
});

describe('bucketizeNight', () => {
  it('returns all-quiet for no snoring events', () => {
    const out = bucketizeNight([ev({ label: 'ambient' }), ev({ label: 'sleep_talk' })], 600, 10);
    expect(out).toEqual(new Array(10).fill(0));
  });

  it('marks snoring buckets as 1 and loud snoring as 2', () => {
    // duration 100s, 10 buckets => 10s each
    const out = bucketizeNight(
      [
        ev({ startSec: 0, endSec: 10, peakDb: -25 }), // bucket 0 -> 1
        ev({ startSec: 50, endSec: 60, peakDb: -8 }), // bucket 5 -> 2 (loud)
      ],
      100,
      10
    );
    expect(out[0]).toBe(1);
    expect(out[5]).toBe(2);
    expect(out[1]).toBe(0);
  });

  it('keeps the louder level when events overlap a bucket', () => {
    const out = bucketizeNight(
      [
        ev({ startSec: 0, endSec: 10, peakDb: -30 }), // -> 1
        ev({ startSec: 0, endSec: 10, peakDb: -5 }), // -> 2, should win
      ],
      100,
      10
    );
    expect(out[0]).toBe(2);
  });

  it('spans multiple buckets for a long event', () => {
    const out = bucketizeNight([ev({ startSec: 0, endSec: 30, peakDb: -20 })], 100, 10);
    expect(out.slice(0, 3)).toEqual([1, 1, 1]);
    expect(out[3]).toBe(0);
  });

  it('handles zero duration safely', () => {
    expect(bucketizeNight([ev({})], 0, 10)).toEqual(new Array(10).fill(0));
  });
});
