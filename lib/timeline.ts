// 夜のサウンドタイムライン（signature）の純粋データ化。
// セッションを N バケットに割り、各バケットのいびき強度を 0/1/2 で返す。
// 0=静か(環境音/寝言) 1=いびき 2=大きめのいびき(peakDb > -15)。テスト可能。

import type { ClassificationEvent } from '../store/types';

export type Intensity = 0 | 1 | 2;

export function bucketizeNight(
  events: ClassificationEvent[],
  durationSec: number,
  buckets = 60
): Intensity[] {
  const out: Intensity[] = new Array(buckets).fill(0) as Intensity[];
  if (durationSec <= 0 || buckets <= 0) return out;
  const bw = durationSec / buckets;

  for (const e of events) {
    if (e.label !== 'snoring') continue;
    const level: Intensity = e.peakDb > -15 ? 2 : 1;
    const startB = Math.max(0, Math.floor(e.startSec / bw));
    const endB = Math.min(buckets - 1, Math.floor((e.endSec - 1e-6) / bw));
    for (let b = startB; b <= endB; b++) {
      if (level > out[b]) out[b] = level;
    }
  }
  return out;
}
