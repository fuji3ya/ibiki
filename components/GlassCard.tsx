import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';

// ガラス質感カード v2（承認 HTML .glass の RN 移植）。
// 半透明の縦グラデ + 微細ボーダー + 上端の白ハイライト1本で「ガラス」を出す。
// フラットな単色カードの置き換え（安っぽさの主因だった）。
export function GlassCard({
  children,
  style,
  radius = 20,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; radius?: number }>) {
  return (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      <LinearGradient
        colors={[theme.glassTop, theme.glassBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      {/* 上端ハイライト（中央が明るいヘアライン） */}
      <LinearGradient
        colors={['transparent', theme.glassHighlight, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topline}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: theme.glassBorder,
    overflow: 'hidden',
  },
  topline: { position: 'absolute', top: 0, left: 14, right: 14, height: 1 },
});
