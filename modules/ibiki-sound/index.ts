import IbikiSoundModule from './src/IbikiSoundModule';
import type { RawClassifyResult } from './src/IbikiSound.types';

export type { RawClassifyResult };

// 端末内の音分類（Apple SoundAnalysis version1）が使えるか。iOS 15+。
export function isSupported(): boolean {
  return IbikiSoundModule.isSupported();
}

// 録音済み音声ファイル（m4a/caf 等の file:// URI）を端末内でバッチ解析し、
// 時間ウィンドウごとの生分類結果（label/startSec/endSec/peakDb/confidence）を返す。
// ネットワーク・アップロード無し。アプリ語彙への変換は lib/classification.ts。
export async function classifyFile(uri: string): Promise<RawClassifyResult[]> {
  return IbikiSoundModule.classifyFile(uri);
}

// もしネイティブが未リンクなら理由が入る（診断用、通常は undefined）。
export const loadError: string | undefined = (IbikiSoundModule as { __loadError?: string }).__loadError;
