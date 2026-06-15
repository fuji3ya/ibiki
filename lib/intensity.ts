// いびきの強度4段階内訳（SnoreLab の Quiet/Light/Loud/Epic に相当する signature 指標）。
// 各いびきイベントを peakDb で4段階に振り分け、段階ごとの合計秒と割合を返す。
// ネイティブ依存なし＝ vitest でテスト可能。
//
// しきい値は dBFS(<=0)。timeline.ts の「大きめ = peakDb > -15」と整合させ、
// epic ≈ -14dB 以上に置く。録音は 16kHz mono AAC なので絶対値でなく相対の目安。

import type { ClassificationEvent } from '../store/types';

export type IntensityTier = 'quiet' | 'light' | 'loud' | 'epic';

// 静か → 特大 の順（積み上げバー描画もこの順）。
export const TIER_ORDER: IntensityTier[] = ['quiet', 'light', 'loud', 'epic'];

export const TIER_LABEL_JA: Record<IntensityTier, string> = {
  quiet: 'しずか',
  light: 'かるい',
  loud: '大きい',
  epic: '特大',
};

// peakDb(dBFS, <=0) → 強度段階。
export function tierForDb(db: number): IntensityTier {
  if (db >= -14) return 'epic';
  if (db >= -22) return 'loud';
  if (db >= -30) return 'light';
  return 'quiet';
}

export type TierSlice = { tier: IntensityTier; sec: number; pct: number };

export type IntensityBreakdown = {
  totalSec: number; // いびきと判定された合計秒
  slices: TierSlice[]; // 常に length 4・TIER_ORDER 順。pct は合計≈100（いびき無しは全0）
  dominant: IntensityTier | null; // いちばん長かった段階。いびき無しは null
};

export function computeIntensityBreakdown(events: ClassificationEvent[]): IntensityBreakdown {
  const sec: Record<IntensityTier, number> = { quiet: 0, light: 0, loud: 0, epic: 0 };
  for (const e of events) {
    if (e.label !== 'snoring') continue;
    const d = Math.max(0, e.endSec - e.startSec);
    if (d <= 0) continue;
    sec[tierForDb(e.peakDb)] += d;
  }
  const totalSec = TIER_ORDER.reduce((a, t) => a + sec[t], 0);
  const slices: TierSlice[] = TIER_ORDER.map((tier) => ({
    tier,
    sec: Math.round(sec[tier]),
    pct: totalSec > 0 ? (sec[tier] / totalSec) * 100 : 0,
  }));
  let dominant: IntensityTier | null = null;
  if (totalSec > 0) {
    dominant = TIER_ORDER.reduce((best, t) => (sec[t] > sec[best] ? t : best), TIER_ORDER[0]);
  }
  return { totalSec, slices, dominant };
}
