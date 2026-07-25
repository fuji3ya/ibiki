import * as Haptics from 'expo-haptics';

// ハプティクスは fire-and-forget（失敗してもUXを止めない）。
// 夜間アプリなので控えめに: 主要アクションの確認感にだけ使う。
const quiet = (p: Promise<unknown>) => {
  p.catch(() => {});
};

/** 軽いタップ確認（タブ切替・小さなボタン） */
export function tapLight() {
  quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** 就寝・起床など、アクションの節目 */
export function tapMedium() {
  quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** プラン選択などのセレクション変更 */
export function select() {
  quiet(Haptics.selectionAsync());
}

/** 成功（購入完了・レポート完成） */
export function notifySuccess() {
  quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** 注意（エラー表示と同時に） */
export function notifyWarning() {
  quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
