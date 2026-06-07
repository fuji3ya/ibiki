// expo-audio（SDK56）の録音まわりヘルパ。録音インスタンス自体はフック
// （useAudioRecorder）で screen 側に持つため、ここでは「音声セッション設定」「権限」
// 「就寝向け録音オプション」を提供する。純粋な選定ロジックは lib/highlights.ts。

import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  setAudioModeAsync,
  type RecordingOptions,
} from 'expo-audio';

// 就寝中の長時間録音向け：モノラル・16kHz・AAC(m4a)。SoundAnalysis version1 は
// 内部でリサンプルするため 16kHz で十分、かつファイルサイズと電池に優しい（plan §4.4）。
export const SLEEP_RECORDING_OPTIONS: RecordingOptions = {
  isMeteringEnabled: true, // 録音中の音量メーター表示に使う
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
  },
  web: {
    mimeType: 'audio/mp4',
    bitsPerSecond: 32000,
  },
};

// 録音開始前に呼ぶ。無音モードでも録音し、バックグラウンドでも継続させる。
// allowsBackgroundRecording は app.json の UIBackgroundModes:["audio"] と対で機能する。
export async function configureSleepAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
    allowsBackgroundRecording: true,
    interruptionMode: 'mixWithOthers',
  });
}

// 録音停止後に録音セッションを解放（再生だけの状態へ戻す）。
export async function releaseRecordingAudioMode(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false });
}

// マイク権限を要求し、許可されたかを返す。
export async function ensureMicPermission(): Promise<boolean> {
  const status = await AudioModule.requestRecordingPermissionsAsync();
  return status.granted;
}
