// いびき — 夜の睡眠アプリ用ダークパレット。落ち着いた紺〜藍ベース。
// 設計の作り込み(design-reference-first: SnoreLab/Sleep Cycle 北極星 + HTML先行)は
// Phase 5 の ship ゲート前に別パスで上げる。ここは機能優先の土台トークン。

export const theme = {
  bg: '#04060F', // 天頂のいちばん暗いところ（v2）
  bgElevated: '#141A2E', // 不透明カード（旧・残置）
  bgElevated2: '#1C2540',
  border: '#26304D',
  text: '#EAF0FF',
  textDim: '#9FB0D0',
  textFaint: '#5E6C8E',
  accent: '#8FB5FF', // 月明かりブルー
  accentSoft: '#5C7CC4',
  good: '#7ED9A6', // 静かな夜
  warn: '#FFC56B', // 注意
  danger: '#FF8BA0',
  snore: '#B49CFF', // いびき
  talk: '#6FE0D0', // 寝言
  // v2 ガラス質感（承認 HTML ibiki-screens-v2.html のトークン）
  glassTop: 'rgba(150,170,225,0.085)',
  glassBottom: 'rgba(110,128,185,0.045)',
  glassBorder: 'rgba(148,168,220,0.16)',
  glassHighlight: 'rgba(255,255,255,0.10)',
} as const;

export type Theme = typeof theme;
