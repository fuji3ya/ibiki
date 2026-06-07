import { describe, it, expect } from 'vitest';
import { mapRawLabel, aggregateEvents, type RawClassifyResult } from '../lib/classification';

describe('mapRawLabel', () => {
  it('maps snoring/snort variants to snoring', () => {
    expect(mapRawLabel('snoring')).toBe('snoring');
    expect(mapRawLabel('Snort')).toBe('snoring');
    expect(mapRawLabel('snore_loud')).toBe('snoring'); // includes "snor"
  });

  it('maps speech variants to sleep_talk', () => {
    expect(mapRawLabel('speech')).toBe('sleep_talk');
    expect(mapRawLabel('shout')).toBe('sleep_talk');
    expect(mapRawLabel('person_talking')).toBe('sleep_talk'); // includes "talk"
  });

  it('falls back to ambient for unknown / silence', () => {
    expect(mapRawLabel('silence')).toBe('ambient');
    expect(mapRawLabel('air_conditioner')).toBe('ambient');
    expect(mapRawLabel('')).toBe('ambient');
  });

  it('does NOT fabricate teeth_grinding (no version1 class)', () => {
    expect(mapRawLabel('teeth')).toBe('ambient');
  });
});

describe('aggregateEvents', () => {
  const sid = 'S1';

  it('merges consecutive snoring windows into one event with max peak/confidence', () => {
    const raw: RawClassifyResult[] = [
      { label: 'snoring', startSec: 0, endSec: 1, peakDb: -20, confidence: 0.8 },
      { label: 'snoring', startSec: 1, endSec: 2, peakDb: -12, confidence: 0.9 },
      { label: 'snoring', startSec: 2, endSec: 3, peakDb: -18, confidence: 0.7 },
    ];
    const ev = aggregateEvents(raw, { sessionId: sid });
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({
      sessionId: sid,
      label: 'snoring',
      startSec: 0,
      endSec: 3,
      peakDb: -12, // max
      confidence: 0.9, // max
    });
    expect(ev[0].id).toBe('S1-evt-0');
  });

  it('low-confidence windows are demoted to ambient and dropped by default', () => {
    const raw: RawClassifyResult[] = [
      { label: 'snoring', startSec: 0, endSec: 1, peakDb: -30, confidence: 0.3 }, // < 0.5 -> ambient
      { label: 'snoring', startSec: 1, endSec: 2, peakDb: -10, confidence: 0.95 },
    ];
    const ev = aggregateEvents(raw, { sessionId: sid });
    expect(ev).toHaveLength(1);
    expect(ev[0].startSec).toBe(1);
    expect(ev[0].label).toBe('snoring');
  });

  it('does not merge across a gap larger than mergeGapSec', () => {
    const raw: RawClassifyResult[] = [
      { label: 'snoring', startSec: 0, endSec: 1, peakDb: -15, confidence: 0.8 },
      { label: 'snoring', startSec: 5, endSec: 6, peakDb: -15, confidence: 0.8 }, // gap 4s > 1s
    ];
    const ev = aggregateEvents(raw, { sessionId: sid, mergeGapSec: 1.0 });
    expect(ev).toHaveLength(2);
  });

  it('keeps distinct adjacent labels separate (snoring then sleep_talk)', () => {
    const raw: RawClassifyResult[] = [
      { label: 'snoring', startSec: 0, endSec: 1, peakDb: -15, confidence: 0.8 },
      { label: 'speech', startSec: 1, endSec: 2, peakDb: -25, confidence: 0.7 },
    ];
    const ev = aggregateEvents(raw, { sessionId: sid });
    expect(ev.map((e) => e.label)).toEqual(['snoring', 'sleep_talk']);
  });

  it('can keep ambient when dropAmbient=false (for full timeline)', () => {
    const raw: RawClassifyResult[] = [
      { label: 'silence', startSec: 0, endSec: 1, peakDb: -90, confidence: 0.99 },
      { label: 'snoring', startSec: 1, endSec: 2, peakDb: -10, confidence: 0.9 },
    ];
    const ev = aggregateEvents(raw, { sessionId: sid, dropAmbient: false });
    expect(ev).toHaveLength(2);
    expect(ev[0].label).toBe('ambient');
  });

  it('sorts unordered input by startSec before aggregating', () => {
    const raw: RawClassifyResult[] = [
      { label: 'snoring', startSec: 2, endSec: 3, peakDb: -14, confidence: 0.8 },
      { label: 'snoring', startSec: 0, endSec: 1, peakDb: -16, confidence: 0.8 },
      { label: 'snoring', startSec: 1, endSec: 2, peakDb: -12, confidence: 0.8 },
    ];
    const ev = aggregateEvents(raw, { sessionId: sid });
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ startSec: 0, endSec: 3, peakDb: -12 });
  });
});
