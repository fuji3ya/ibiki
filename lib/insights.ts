// トレンド系列と「対策×効果」分析の純粋関数（ネイティブ依存なし＝テスト対象）。
//
// 競合リサーチ 2026-06-10 の結論を実装:
// - トレンド = 毎晩開く理由（リテンションの核）。夜ごとのいびきスコア推移。
// - 対策×効果 = SnoreLab 課金主力（Remedies）。「試した夜」と「試してない夜」の
//   平均スコア差を見せる（スコアは低いほど良いので、負の差=効いてる）。

import type { ClassificationEvent, RecordingSession } from '../store/types';

export type TrendPoint = {
  sessionId: string;
  date: string; // 'YYYY-MM-DD'（ローカル）
  score: number;
  snoringSec: number | null; // 不明なら null（旧データ互換）
};

// 直近 limit 夜のスコア系列（古い→新しい順）。同日複数セッションはそのまま並べる。
export function buildTrendSeries(
  sessions: Pick<RecordingSession, 'id' | 'startedAt' | 'nightlyScore'>[],
  toDateKey: (d: Date) => string,
  limit = 14
): TrendPoint[] {
  return [...sessions]
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-limit)
    .map((s) => ({
      sessionId: s.id,
      date: toDateKey(new Date(s.startedAt)),
      score: s.nightlyScore,
      snoringSec: null,
    }));
}

export type RemedyEffect = {
  remedyId: string;
  nightsWith: number;
  nightsWithout: number;
  avgWith: number; // 試した夜の平均スコア
  avgWithout: number; // 試してない夜の平均スコア
  delta: number; // avgWith - avgWithout（負 = スコアが下がった = 効いてる兆し）
};

// 対策ごとの効果推定。比較が成立する（両群に1夜以上）対策のみ返し、
// 効果が大きい順（delta 昇順 = より下がった順）に並べる。
export function computeRemedyEffects(
  sessions: Pick<RecordingSession, 'id' | 'nightlyScore'>[],
  tags: { sessionId: string; remedyId: string }[]
): RemedyEffect[] {
  const scoreById = new Map(sessions.map((s) => [s.id, s.nightlyScore]));
  const remedyIds = [...new Set(tags.map((t) => t.remedyId))];
  const taggedBy = new Map<string, Set<string>>();
  for (const t of tags) {
    if (!taggedBy.has(t.remedyId)) taggedBy.set(t.remedyId, new Set());
    taggedBy.get(t.remedyId)!.add(t.sessionId);
  }

  const out: RemedyEffect[] = [];
  for (const rid of remedyIds) {
    const withSet = taggedBy.get(rid)!;
    const withScores: number[] = [];
    const withoutScores: number[] = [];
    for (const [sid, score] of scoreById) {
      (withSet.has(sid) ? withScores : withoutScores).push(score);
    }
    if (withScores.length === 0 || withoutScores.length === 0) continue;
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const avgWith = avg(withScores);
    const avgWithout = avg(withoutScores);
    out.push({
      remedyId: rid,
      nightsWith: withScores.length,
      nightsWithout: withoutScores.length,
      avgWith: Math.round(avgWith * 10) / 10,
      avgWithout: Math.round(avgWithout * 10) / 10,
      delta: Math.round((avgWith - avgWithout) * 10) / 10,
    });
  }
  return out.sort((a, b) => a.delta - b.delta);
}

// --- 前夜 / 平均との差分（単発レポートをトレンドに繋ぐ＝毎晩開く動機）---

export type ScoreDelta = {
  prevScore: number | null; // 直前の夜のスコア（無ければ null）
  avgScore: number | null; // それ以前の平均スコア（無ければ null）
  deltaPrev: number | null; // 今夜 - 前夜（負 = 静かになった = 改善）
  sampleCount: number; // 平均に使った過去夜数
};

// priorScoresNewestFirst: 今夜より前の夜のスコアを「新しい順」で渡す。
export function computeScoreDelta(
  currentScore: number,
  priorScoresNewestFirst: number[]
): ScoreDelta {
  const sample = priorScoresNewestFirst.filter((n) => Number.isFinite(n));
  if (sample.length === 0) {
    return { prevScore: null, avgScore: null, deltaPrev: null, sampleCount: 0 };
  }
  const prevScore = sample[0];
  const avgScore = Math.round((sample.reduce((a, b) => a + b, 0) / sample.length) * 10) / 10;
  return {
    prevScore,
    avgScore,
    deltaPrev: Math.round((currentScore - prevScore) * 10) / 10,
    sampleCount: sample.length,
  };
}

// --- 夜の読み解き（最も多かった時間帯・最長の静かな区間）---

export type NightInsight = {
  peakStartSec: number | null; // いびきが最も多かった1時間枠の開始（session内オフセット秒）
  peakSnoreSec: number; // その枠のいびき秒
  longestQuietMin: number; // いびきが無かった最長連続区間（分）
};

export function summarizeNight(
  events: ClassificationEvent[],
  durationSec: number
): NightInsight {
  const snore = events
    .filter((e) => e.label === 'snoring' && e.endSec > e.startSec)
    .sort((a, b) => a.startSec - b.startSec);
  const dur = Math.max(0, durationSec);
  if (snore.length === 0) {
    return { peakStartSec: null, peakSnoreSec: 0, longestQuietMin: Math.round(dur / 60) };
  }

  // 1時間枠ごとのいびき秒を集計（イベントは開始時刻の枠へ寄せる近似）。
  const HOUR = 3600;
  const bins = new Map<number, number>();
  for (const e of snore) {
    const bin = Math.floor(e.startSec / HOUR);
    bins.set(bin, (bins.get(bin) ?? 0) + (e.endSec - e.startSec));
  }
  let peakBin = 0;
  let peakSec = 0;
  for (const [bin, sec] of bins) {
    if (sec > peakSec) {
      peakSec = sec;
      peakBin = bin;
    }
  }

  // 最長の静かな区間（先頭・イベント間・末尾のギャップの最大）。
  let longestQuiet = snore[0].startSec;
  for (let i = 1; i < snore.length; i++) {
    longestQuiet = Math.max(longestQuiet, snore[i].startSec - snore[i - 1].endSec);
  }
  longestQuiet = Math.max(longestQuiet, dur - snore[snore.length - 1].endSec);

  return {
    peakStartSec: peakBin * HOUR,
    peakSnoreSec: Math.round(peakSec),
    longestQuietMin: Math.round(Math.max(0, longestQuiet) / 60),
  };
}
