// 夜間スコア（0-100）と根拠文(WHY)を算出する純粋関数。ネイティブ依存なし＝テスト可能。
//
// 健康系の信頼づくりのため、スコアは数字だけでなく **根拠文** を必ず返す（plan §5）。
// 医療表現は禁止（無呼吸/診断/検出 等を使わない）。「記録」「傾向」に留める。

import type { ClassificationEvent } from '../store/types';

export type ScoreInput = {
  durationSec: number;
  events: ClassificationEvent[];
};

export type ScoreResult = {
  score: number; // 0-100（高いほど静かな夜）
  reason: string; // WHY（医療表現なし）
  snoringSec: number; // いびきと記録された合計秒
  snoringRatio: number; // 0-1
  peakDb: number; // いびきイベントの最大ピーク(dBFS, <=0)。いびき無しは -120
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// スコア帯の短いラベル（リング中央に出す。医療表現なし）。
export function scoreBandLabel(score: number): string {
  if (score >= 75) return 'ぐっすり';
  if (score >= 50) return 'まずまず';
  return '気になる';
}

export function computeNightlyScore(input: ScoreInput): ScoreResult {
  const durationSec = Math.max(1, input.durationSec); // 0 除算回避
  const snoring = input.events.filter((e) => e.label === 'snoring');

  const snoringSec = snoring.reduce((acc, e) => acc + Math.max(0, e.endSec - e.startSec), 0);
  const snoringRatio = clamp(snoringSec / durationSec, 0, 1);
  const peakDb = snoring.length ? Math.max(...snoring.map((e) => e.peakDb)) : -120;

  // いびき時間比率のペナルティ（夜全体に占める割合）。最大 -55。
  const ratioPenalty = Math.round(snoringRatio * 55);
  // 音量ペナルティ（大きいいびきほど睡眠の妨げになりやすい）。dBFS が 0 に近いほど大。
  let loudnessPenalty = 0;
  if (snoring.length) {
    if (peakDb > -15) loudnessPenalty = 20;
    else if (peakDb > -25) loudnessPenalty = 10;
    else loudnessPenalty = 3;
  }

  const score = clamp(100 - ratioPenalty - loudnessPenalty, 0, 100);
  const reason = buildReason({ snoringRatio, snoringSec, peakDb, hasSnoring: snoring.length > 0 });

  return { score, reason, snoringSec, snoringRatio, peakDb };
}

function buildReason(p: {
  snoringRatio: number;
  snoringSec: number;
  peakDb: number;
  hasSnoring: boolean;
}): string {
  if (!p.hasSnoring) {
    return 'いびきの音はほとんど記録されませんでした。比較的静かな夜だったようです。';
  }
  const pct = Math.round(p.snoringRatio * 100);
  const loud = p.peakDb > -15 ? '大きめ' : p.peakDb > -25 ? '中くらい' : '小さめ';
  if (pct >= 40) {
    return `夜の約${pct}%でいびきの音が記録されました。音量は${loud}で、まとまった時間続いた傾向があります。`;
  }
  if (pct >= 10) {
    return `夜の約${pct}%でいびきの音が記録されました。音量は${loud}で、断続的に見られる傾向でした。`;
  }
  return `いびきの音はわずかに記録されました（夜の約${pct}%、音量は${loud}）。`;
}
