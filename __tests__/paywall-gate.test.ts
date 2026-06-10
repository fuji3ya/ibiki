import { describe, it, expect } from 'vitest';
import { shouldShowHardPaywall, FREE_NIGHTS } from '../lib/paywall-gate';

describe('shouldShowHardPaywall', () => {
  it('never paywalls a pro user, regardless of session count', () => {
    expect(shouldShowHardPaywall({ isPro: true, sessionCount: 0 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: true, sessionCount: 2 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: true, sessionCount: 100 })).toBe(false);
  });

  it('first night is the free taste — report stays open', () => {
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 0 })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 1 })).toBe(false);
  });

  it('fires from the 2nd recorded night onward for free users', () => {
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 2 })).toBe(true);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: 5 })).toBe(true);
  });

  it('FREE_NIGHTS constant matches the boundary', () => {
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: FREE_NIGHTS })).toBe(false);
    expect(shouldShowHardPaywall({ isPro: false, sessionCount: FREE_NIGHTS + 1 })).toBe(true);
  });
});
