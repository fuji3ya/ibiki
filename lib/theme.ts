// いびき — 夜の睡眠アプリ用ダークパレット。落ち着いた紺〜藍ベース。
// 設計の作り込み(design-reference-first: SnoreLab/Sleep Cycle 北極星 + HTML先行)は
// Phase 5 の ship ゲート前に別パスで上げる。ここは機能優先の土台トークン。

export const theme = {
  bg: '#0B0E1A', // 夜空のいちばん暗いところ
  bgElevated: '#141A2E', // カード
  bgElevated2: '#1C2540',
  border: '#26304D',
  text: '#EAF0FF',
  textDim: '#9FB0D0',
  textFaint: '#5A6A8C',
  accent: '#8BB4FF', // 月明かりブルー
  accentSoft: '#5C7CC4',
  good: '#7ED9A6', // 静かな夜
  warn: '#FFC56B', // 注意
  danger: '#FF8BA0',
  snore: '#B69CFF', // いびき
  talk: '#7ED9D9', // 寝言
} as const;

export type Theme = typeof theme;
