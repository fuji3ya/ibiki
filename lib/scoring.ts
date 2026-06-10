// いびきスコア（B案 2026-06-10 ふじ決定）を算出する純粋関数。ネイティブ依存なし＝テスト可能。
//
// SnoreLab "Snore Score" と同じ語彙に寄せる（競合リサーチ 2026-06-10 の結論）:
//   スコア = いびきの平均音圧(0-1) × いびき合計時間(分)
//   **低いほど良い**。目安: 10以下=ほぼ無し / ~25=典型 / 50超=多め / 100超=かなり多め（上限なし）
// いびきラボから乗り換えても直感が通じる連続値。睡眠の質ではなく「いびきの量」の指標。
//
// 健康系の信頼づくりのため、スコアは数字だけでなく **根拠文** を必ず返す（plan §5）。
// 医療表現は禁止（無呼吸/診断/検出 等を使わない）。「記録」「傾向」に留める。

import type { ClassificationEvent } from '../store/types';

export type ScoreInput = {
  durationSec: number;
  events: ClassificationEvent[];
};

export type ScoreResult = {
  score: number; // いびきスコア（0〜・低いほど良い・100 超もあり得る）
  reason: string; // WHY（医療表現なし）
  snoringSec: number; // いびきと記録された合計秒
  snoringRatio: number; // 0-1（夜に占めるいびき時間の比率）
  peakDb: number; // いびきイベントの最大ピーク(dBFS, <=0)。いびき無しは -120
  avgIntensity: number; // いびきの平均音圧 0-1（-60dBFS..0dBFS を線形マップ）
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// dBFS(<=0) → 0..1 の音圧。-60dB を下限とする（format.dbToMeter と同じ写像）。
export function dbToIntensity(db: number): number {
  return clamp((db + 60) / 60, 0, 1);
}

// スコア帯の短いラベル（リング中央に出す。低い=良い。医療表現なし）。
export function scoreBandLabel(score: number): string {
  if (score < 10) return 'ほぼ無し';
  if (score < 25) return 'すこし';
  if (score < 50) return 'ふつう';
  if (score < 100) return '多め';
  return 'かなり多め';
}

// スコア帯の色区分（UI 用）: good(低い) / warn(中) / danger(高い)。
export function scoreBand(score: number): 'good' | 'warn' | 'danger' {
  if (score < 25) return 'good';
  if (score < 50) return 'warn';
  return 'danger';
}

export function computeNightlyScore(input: ScoreInput): ScoreResult {
  const durationSec = Math.max(1, input.durationSec); // 0 除算回避
  const snoring = input.events.filter((e) => e.label === 'snoring');

  const snoringSec = snoring.reduce((acc, e) => acc + Math.max(0, e.endSec - e.startSec), 0);
  const snoringRatio = clamp(snoringSec / durationSec, 0, 1);
  const peakDb = snoring.length ? Math.max(...snoring.map((e) => e.peakDb)) : -120;

  // 平均音圧 = 各いびきイベントの音圧を時間で加重平均（イベントが無ければ 0）。
  let avgIntensity = 0;
  if (snoringSec > 0) {
    const weighted = snoring.reduce(
      (acc, e) => acc + dbToIntensity(e.peakDb) * Math.max(0, e.endSec - e.startSec),
      0
    );
    avgIntensity = clamp(weighted / snoringSec, 0, 1);
  }

  // いびきスコア = 平均音圧 × いびき合計分。SnoreLab と同レンジ感
  // （例: 中くらいの音圧0.4で1時間 → 24 ≒ 典型値25）。
  const score = Math.round(avgIntensity * (snoringSec / 60));

  const reason = buildReason({ snoringRatio, peakDb, hasSnoring: snoring.length > 0, score });
  return { score, reason, snoringSec, snoringRatio, peakDb, avgIntensity };
}

function buildReason(p: {
  snoringRatio: number;
  peakDb: number;
  hasSnoring: boolean;
  score: number;
}): string {
  if (!p.hasSnoring) {
    return 'いびきの音はほとんど記録されませんでした。静かな夜でした。';
  }
  const pct = Math.round(p.snoringRatio * 100);
  const loud = p.peakDb > -15 ? '大きめ' : p.peakDb > -25 ? '中くらい' : '小さめ';
  if (p.score >= 50) {
    return `夜の約${pct}%でいびきの音が記録されました。音量は${loud}で、まとまった時間続いた傾向があります。下の対策を試して、明日のスコアとくらべてみましょう。`;
  }
  if (p.score >= 10) {
    return `夜の約${pct}%でいびきの音が記録されました。音量は${loud}で、断続的に見られる傾向でした。`;
  }
  return `いびきの音はわずかに記録されました（夜の約${pct}%、音量は${loud}）。`;
}
