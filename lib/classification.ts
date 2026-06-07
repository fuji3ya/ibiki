// SoundAnalysis の生分類結果（時間ウィンドウ列）→ アプリ語彙の ClassificationEvent[] へ
// 変換する純粋関数群。ネイティブ依存なし＝ vitest でテスト可能。
//
// 設計方針（plan §4.2）:
// - いびきは version1 の "snoring"/"snort" で確定。
// - 寝言は "speech" 系のヒューリスティック（過信させない）。
// - 歯ぎしりは version1 に専用クラスが無いため **でっち上げない**（ambient に倒す）。
// - confidence が閾値未満のウィンドウは ambient 扱い（誤検出抑制）。
// - 連続する同ラベルのウィンドウを 1 イベントに統合（peakDb=max, confidence=max）。

import type { ClassificationEvent, ClassificationLabel } from '../store/types';

export type RawClassifyResult = {
  label: string;
  startSec: number;
  endSec: number;
  peakDb: number;
  confidence: number;
};

// 生 identifier（小文字）→ アプリ語彙の明示マップ。
export const RAW_LABEL_MAP: Record<string, ClassificationLabel> = {
  snoring: 'snoring',
  snort: 'snoring',
  speech: 'sleep_talk',
  shout: 'sleep_talk',
  whispering: 'sleep_talk',
};

// 生ラベル 1 個 → アプリ語彙。未知や弱シグナルは ambient（保守的）。
export function mapRawLabel(raw: string): ClassificationLabel {
  const key = (raw ?? '').toLowerCase().trim();
  if (key in RAW_LABEL_MAP) return RAW_LABEL_MAP[key];
  if (key.includes('snor')) return 'snoring';
  if (key.includes('speech') || key.includes('talk') || key.includes('shout')) return 'sleep_talk';
  return 'ambient';
}

export type AggregateOptions = {
  sessionId: string;
  /** これ未満の confidence のウィンドウは ambient 扱い（既定 0.5） */
  minConfidence?: number;
  /** 同ラベルのイベントを跨いで統合する最大ギャップ秒（既定 1.0） */
  mergeGapSec?: number;
  /** ambient イベントを結果から落とすか（既定 true：意味のある音だけ残す） */
  dropAmbient?: boolean;
  /** id 生成（テスト決定性のため注入可能。既定は sessionId 連番） */
  makeId?: (sessionId: string, index: number) => string;
};

// 生ウィンドウ列 → ClassificationEvent[]。入力は時系列順（startSec 昇順）を想定。
export function aggregateEvents(
  raw: RawClassifyResult[],
  opts: AggregateOptions
): ClassificationEvent[] {
  const minConfidence = opts.minConfidence ?? 0.5;
  const mergeGapSec = opts.mergeGapSec ?? 1.0;
  const dropAmbient = opts.dropAmbient ?? true;
  const makeId = opts.makeId ?? ((s, i) => `${s}-evt-${i}`);

  // 1) 各ウィンドウを (label, ...) に正規化。低 confidence は ambient に倒す。
  const sorted = [...raw].sort((a, b) => a.startSec - b.startSec);
  const windows = sorted.map((w) => {
    const label: ClassificationLabel =
      w.confidence >= minConfidence ? mapRawLabel(w.label) : 'ambient';
    return { label, startSec: w.startSec, endSec: w.endSec, peakDb: w.peakDb, confidence: w.confidence };
  });

  // 2) 連続する同ラベル（かつギャップ <= mergeGapSec）を 1 イベントに統合。
  type Acc = { label: ClassificationLabel; startSec: number; endSec: number; peakDb: number; confidence: number };
  const merged: Acc[] = [];
  for (const w of windows) {
    const last = merged[merged.length - 1];
    if (last && last.label === w.label && w.startSec - last.endSec <= mergeGapSec) {
      last.endSec = Math.max(last.endSec, w.endSec);
      last.peakDb = Math.max(last.peakDb, w.peakDb);
      last.confidence = Math.max(last.confidence, w.confidence);
    } else {
      merged.push({ ...w });
    }
  }

  // 3) ambient を落とし、ClassificationEvent へ。
  const kept = dropAmbient ? merged.filter((m) => m.label !== 'ambient') : merged;
  return kept.map((m, i) => ({
    id: makeId(opts.sessionId, i),
    sessionId: opts.sessionId,
    label: m.label,
    startSec: m.startSec,
    endSec: m.endSec,
    peakDb: m.peakDb,
    confidence: m.confidence,
  }));
}
