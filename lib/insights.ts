// トレンド系列と「対策×効果」分析の純粋関数（ネイティブ依存なし＝テスト対象）。
//
// 競合リサーチ 2026-06-10 の結論を実装:
// - トレンド = 毎晩開く理由（リテンションの核）。夜ごとのいびきスコア推移。
// - 対策×効果 = SnoreLab 課金主力（Remedies）。「試した夜」と「試してない夜」の
//   平均スコア差を見せる（スコアは低いほど良いので、負の差=効いてる）。

import type { RecordingSession } from '../store/types';

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
