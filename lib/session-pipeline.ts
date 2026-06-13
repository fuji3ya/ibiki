// 録音停止後の一連の処理を 1 関数に束ねる：
//   生録音ファイル → 端末内分類(native) → イベント集約 → 夜間スコア → ハイライト選定
//   → SQLite 保存 → ストリーク更新。
// 純粋ロジック（aggregate/score/highlights/streak）はテスト済み。本関数は
// それらと native(classifyFile)/db を配線するオーケストレータ。

import { classifyFile, isSupported } from 'ibiki-sound';
import { aggregateEvents } from './classification';
import { computeNightlyScore, type ScoreResult } from './scoring';
import { buildHighlights } from './highlights';
import { updateStreak, toLocalDateKey } from './streak';
import {
  insertSession,
  insertEvents,
  insertHighlights,
  getStreak,
  saveStreak,
} from './db';
import { uid } from './id';
import type { ClassificationEvent, HighlightClip, RecordingSession, Streak } from '../store/types';

export type ProcessResult = {
  session: RecordingSession;
  events: ClassificationEvent[];
  highlights: HighlightClip[];
  score: ScoreResult;
  streak: Streak;
  analysisTimedOut: boolean;
};

// 端末内分析が万一返ってこなくても UI を永久ハングさせないための上限。
// O(n) 化 + overlapFactor=0 で一晩録音でも通常は数十秒〜数分で終わる想定。
// この時間を超えたら「その時点までの結果（空でも可）」でレポートを作り、必ず画面を出す。
const ANALYZE_TIMEOUT_MS = 8 * 60 * 1000;

// p が ms 以内に解決しなければ fallback を返す（p 自体は reject しても fallback を返す）。
// p はバックグラウンドで走り続けるが、呼び出し側はブロックされない。
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<{ value: T; timedOut: boolean }> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ value: fallback, timedOut: true });
    }, ms);
    p.then((value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ value, timedOut: false });
    }).catch(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ value: fallback, timedOut: false });
    });
  });
}

export async function processRecording(params: {
  audioFileUri: string;
  startedAt: number;
  endedAt: number;
}): Promise<ProcessResult> {
  const { audioFileUri, startedAt, endedAt } = params;
  const durationSec = Math.max(0, (endedAt - startedAt) / 1000);
  const sessionId = uid('s_');

  // 1) 端末内分類（未対応端末や解析失敗でも落とさず空配列で続行）。
  //    解析が ANALYZE_TIMEOUT_MS を超えたら諦めて空で続行 → レポート画面は必ず出す
  //    （永久スピナー＝レポートが出ない、を物理的に防ぐ）。
  let raw: Awaited<ReturnType<typeof classifyFile>> = [];
  let analysisTimedOut = false;
  try {
    if (isSupported()) {
      const r = await withTimeout(classifyFile(audioFileUri), ANALYZE_TIMEOUT_MS, [] as typeof raw);
      raw = r.value;
      analysisTimedOut = r.timedOut;
      if (r.timedOut) {
        console.warn('[ibiki] classifyFile timed out after', ANALYZE_TIMEOUT_MS, 'ms');
      }
    }
  } catch (e) {
    console.warn('[ibiki] classifyFile failed', e instanceof Error ? e.message : e);
  }

  // 2) 集約 → スコア → ハイライト（全て純粋関数）。
  const events = aggregateEvents(raw, { sessionId });
  const score = computeNightlyScore({ durationSec, events });
  const highlights = buildHighlights(events, { sessionId, audioFileUri });

  // 3) 永続化。
  const session: RecordingSession = {
    id: sessionId,
    startedAt,
    endedAt,
    durationSec,
    audioFileUri,
    nightlyScore: score.score,
    createdAt: endedAt,
  };
  await insertSession(session);
  await insertEvents(events);
  await insertHighlights(highlights);

  // 4) ストリーク更新（当夜＝録音終了日のローカル日付）。
  const prev = await getStreak();
  const streak = updateStreak(prev, toLocalDateKey(new Date(endedAt)));
  await saveStreak(streak);

  return { session, events, highlights, score, streak, analysisTimedOut };
}
