// ネイティブ層（SoundAnalysis）が返す 1 ウィンドウ分の生分類結果。
// label は SoundAnalysis version1 の **生の identifier** 文字列（例 "snoring" / "snort"
// / "speech" / "silence" / "breathing"）。アプリ語彙へのマッピングは JS 側
// lib/classification.ts（純粋関数・テスト対象）で行う。
export type RawClassifyResult = {
  /** SoundAnalysis の生 identifier（小文字想定だが未保証 — JS 側で正規化） */
  label: string;
  /** session 内オフセット秒（ウィンドウ開始） */
  startSec: number;
  /** session 内オフセット秒（ウィンドウ終了） */
  endSec: number;
  /** そのウィンドウの PCM ピーク音量（dBFS, <= 0。無音は -120 付近） */
  peakDb: number;
  /** SoundAnalysis の identifier confidence（0-1） */
  confidence: number;
};
