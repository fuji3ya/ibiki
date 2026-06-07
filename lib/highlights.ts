// ハイライトクリップの選定（純粋関数・テスト可能）。
// MVP: 元の長尺録音を残し、各ハイライトは「ファイル + 開始オフセット秒」で参照する
// （再生時に seek）。実際のトリム(別 m4a 生成)は AVAssetExportSession が要る Phase 2+ の
// ストレージ最適化。ここでは"でっち上げ"を避け、実際に再生できる参照を返す。

import type { ClassificationEvent, ClassificationLabel, HighlightClip } from '../store/types';

export type BuildHighlightsOptions = {
  sessionId: string;
  /** 全セッション録音ファイルの URI（各クリップはこれを参照し startSec へ seek） */
  audioFileUri: string;
  /** 残すハイライト最大数（既定 3 = レポートの「ハイライト3クリップ」） */
  max?: number;
  /** 対象ラベル（既定 snoring + sleep_talk。ambient は除外） */
  labels?: ClassificationLabel[];
  makeId?: (sessionId: string, index: number) => string;
};

// イベントからピーク音量が大きい順に最大 N 件をハイライト化する。
export function buildHighlights(
  events: ClassificationEvent[],
  opts: BuildHighlightsOptions
): HighlightClip[] {
  const max = opts.max ?? 3;
  const labels = opts.labels ?? ['snoring', 'sleep_talk'];
  const makeId = opts.makeId ?? ((s, i) => `${s}-clip-${i}`);

  return events
    .filter((e) => labels.includes(e.label))
    .sort((a, b) => b.peakDb - a.peakDb) // 大きい音優先（dBFS は 0 に近いほど大）
    .slice(0, max)
    .map((e, i) => ({
      id: makeId(opts.sessionId, i),
      sessionId: opts.sessionId,
      label: e.label,
      clipUri: opts.audioFileUri,
      startSec: e.startSec,
      peakDb: e.peakDb,
    }));
}
