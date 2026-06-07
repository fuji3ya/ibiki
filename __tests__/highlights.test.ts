import { describe, it, expect } from 'vitest';
import { buildHighlights } from '../lib/highlights';
import type { ClassificationEvent } from '../store/types';

const ev = (over: Partial<ClassificationEvent>): ClassificationEvent => ({
  id: 'e',
  sessionId: 'S',
  label: 'snoring',
  startSec: 0,
  endSec: 5,
  peakDb: -20,
  confidence: 0.9,
  ...over,
});

describe('buildHighlights', () => {
  const uri = 'file:///rec/S.m4a';

  it('picks the loudest events up to max, pointing into the session file', () => {
    const events = [
      ev({ id: 'a', startSec: 10, peakDb: -30 }),
      ev({ id: 'b', startSec: 20, peakDb: -8 }),
      ev({ id: 'c', startSec: 30, peakDb: -15 }),
      ev({ id: 'd', startSec: 40, peakDb: -25 }),
    ];
    const clips = buildHighlights(events, { sessionId: 'S', audioFileUri: uri, max: 2 });
    expect(clips).toHaveLength(2);
    expect(clips.map((c) => c.peakDb)).toEqual([-8, -15]); // loudest first
    expect(clips[0]).toMatchObject({ sessionId: 'S', clipUri: uri, startSec: 20, label: 'snoring' });
    expect(clips[0].id).toBe('S-clip-0');
  });

  it('excludes ambient events', () => {
    const events = [
      ev({ id: 'a', label: 'ambient', peakDb: -2 }),
      ev({ id: 'b', label: 'snoring', peakDb: -18 }),
    ];
    const clips = buildHighlights(events, { sessionId: 'S', audioFileUri: uri });
    expect(clips).toHaveLength(1);
    expect(clips[0].label).toBe('snoring');
  });

  it('includes sleep_talk by default', () => {
    const events = [ev({ id: 'a', label: 'sleep_talk', peakDb: -12 })];
    const clips = buildHighlights(events, { sessionId: 'S', audioFileUri: uri });
    expect(clips).toHaveLength(1);
    expect(clips[0].label).toBe('sleep_talk');
  });

  it('returns empty when no qualifying events', () => {
    const events = [ev({ label: 'ambient' })];
    expect(buildHighlights(events, { sessionId: 'S', audioFileUri: uri })).toEqual([]);
  });
});
