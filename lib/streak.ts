// ストリーク（連続記録日数）更新の純粋関数。ネイティブ依存なし＝テスト可能。
// 判定は「日付（ローカルtz）」単位（plan §3）。録音終了時に当夜の日付で更新する。

import type { Streak } from '../store/types';

// 'YYYY-MM-DD' をローカル日付として解釈し、2 つの差を日数で返す（b - a）。
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  // UTC ベースで日数差を取る（tz オフセットを打ち消すため両方 UTC で構築）。
  const ua = Date.UTC(ay, am - 1, ad);
  const ub = Date.UTC(by, bm - 1, bd);
  return Math.round((ub - ua) / 86_400_000);
}

// 'YYYY-MM-DD'（ローカル）に整形。録音終了時刻 Date から当夜の日付を作るのに使う。
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function updateStreak(prev: Streak | null, nightDate: string): Streak {
  if (!prev) {
    return { current: 1, longest: 1, lastNightDate: nightDate };
  }
  const diff = dayDiff(prev.lastNightDate, nightDate);

  // 同じ日に 2 回目 → 据え置き（二重カウントしない）。
  if (diff === 0) return prev;

  // 翌日 → 連続+1。
  if (diff === 1) {
    const current = prev.current + 1;
    return { current, longest: Math.max(prev.longest, current), lastNightDate: nightDate };
  }

  // 1 日以上空いた（または過去日付）→ リセット。longest は保持。
  return { current: 1, longest: Math.max(prev.longest, 1), lastNightDate: nightDate };
}
