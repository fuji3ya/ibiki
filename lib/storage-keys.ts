/**
 * AsyncStorage key registry — single source of truth so no two modules
 * race on a typo'd key. SQLite holds session/event data; AsyncStorage holds
 * lightweight flags (entitlement mock, onboarding seen, paywall counters).
 */
export const StorageKeys = {
  ENTITLEMENT_ACTIVE: 'ibiki.entitlement.active',
  ONBOARDING_DONE: 'ibiki.onboarding.done',
  REPORTS_VIEWED: 'ibiki.reports.viewed', // counts report opens → 2日目でハードペイウォール
  SAVE_POLICY: 'ibiki.savePolicy', // 'highlights' | 'full'（録音保存ポリシー）
} as const;

export type SavePolicy = 'highlights' | 'full';
