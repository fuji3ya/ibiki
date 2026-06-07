// データモデル（全て端末内 / on-device）。plan §3 の正本。
// RecordingSession 1:N ClassificationEvent / HighlightClip。バックエンドなし。

// 1晩の録音セッション
export type RecordingSession = {
  id: string; // uuid
  startedAt: number; // epoch ms（就寝ボタン）
  endedAt: number; // epoch ms（起床ボタン or 自動停止）
  durationSec: number;
  audioFileUri?: string; // ハイライトのみ保存ポリシーなら undefined もあり得る
  nightlyScore: number; // 0-100（派生値だが再計算回避のため保存）
  createdAt: number;
};

// 分類イベント（SoundAnalysis の各ウィンドウ結果を集約したもの）
export type ClassificationLabel = 'snoring' | 'teeth_grinding' | 'sleep_talk' | 'ambient';

export type ClassificationEvent = {
  id: string;
  sessionId: string;
  label: ClassificationLabel;
  startSec: number; // session 内オフセット秒
  endSec: number;
  peakDb: number; // そのイベントのピーク音量
  confidence: number; // 0-1（SoundAnalysis の identifier confidence）
};

// ハイライトクリップ（保存した代表的な音の切り抜き）
export type HighlightClip = {
  id: string;
  sessionId: string;
  label: ClassificationLabel;
  clipUri: string; // トリム済み短尺 m4a
  startSec: number;
  peakDb: number;
};

// ストリーク
export type Streak = {
  current: number; // 連続日数
  longest: number;
  lastNightDate: string; // 'YYYY-MM-DD'（ローカルtz）
};
