// ハードペイウォールの判定（純粋関数・テスト対象）。
//
// 設計（plan §5 + Mirrorbite deep-link bypass 教訓 + ふじ決定 2026-06-10→2026-06-15）:
// - 価値を先に見せる: 最初の FREE_NIGHTS 夜（=5夜）はレポートを無料で全部見られる。
// - それを超えた夜のレポートを開こうとした時点で Pro でなければハードペイウォール。
// - 強制は「レポート画面そのもの」で行う(録音フロー/履歴ドリル/deep link の
//   どの入口から来ても同じ1点で塞がる)。ナビ側だけのゲートは bypass される。

export type PaywallGateInput = {
  isPro: boolean;
  /** 端末内に保存された記録セッション数（= 記録した夜の数） */
  sessionCount: number;
};

/** 無料で見られる夜の数（ふじ決定 2026-06-15: 5夜は無料で試させる） */
export const FREE_NIGHTS = 5;

// レポートを開く操作にハードペイウォールを出すべきか。
export function shouldShowHardPaywall({ isPro, sessionCount }: PaywallGateInput): boolean {
  if (isPro) return false;
  return sessionCount > FREE_NIGHTS;
}
