import { describe, it, expect } from 'vitest';
import { shouldShowHardPaywall, FREE_NIGHTS } from '../lib/paywall-gate';

describe('shouldShowHardPaywall', () => {
  it('never paywalls a pro user, regardless of session count', () => {
    expect(shouldShowHardPaywall({ isPro: true, sessionCount: 0 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: true, sessionCount: 2 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: true, sessionCount: 100 })).toBe(false);
  });

  it('first 3 nights are the free taste — report stays open', () => {
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 0 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 1 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 2 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 3 })).toBe(false);
  });

  it('fires from the 4th recorded night onward for free users', () => {
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 4 })).toBe(true);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 7 })).toBe(true);
  });

  it('FREE_NIGHTS constant matches the boundary', () => {
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: FREE_NIGHTS })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: FREE_NIGHTS + 1 })).toBe(true);
  });
});
