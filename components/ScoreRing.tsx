import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../lib/theme';

// 夜間スコアの円グラフ。細いグラデリング + バックのブルーム円で発光感（Sleep Cycle 北極星）。
// スコア帯で色が変わる。大きく軽量(thin)な数字。
const BANDS = {
  good: { from: '#9CF0C6', to: '#3F9E7E', glow: 'rgba(126,217,166,0.18)', text: theme.good },
  warn: { from: '#FFD79A', to: '#E0982E', glow: 'rgba(255,197,107,0.16)', text: theme.warn },
  danger: { from: '#FFB0C0', to: '#E06A82', glow: 'rgba(255,139,160,0.16)', text: theme.danger },
} as const;

export function ScoreRing({
  score,
  label,
  size = 188,
  stroke = 11,
}: {
  score: number;
  label?: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;
  const band = clamped >= 75 ? BANDS.good : clamped >= 50 ? BANDS.warn : BANDS.danger;
  const cx = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* バックのブルーム（発光感） */}
      <View
        style={[
          styles.bloom,
          { width: size * 0.78, height: size * 0.78, borderRadius: size, backgroundColor: band.glow },
        ]}
      />
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={band.from} />
            <Stop offset="1" stopColor={band.to} />
          </LinearGradient>
        </Defs>
        {/* トラック */}
        <Circle cx={cx} cy={cx} r={r} stroke="#1A2440" strokeWidth={stroke} fill="none" />
        {/* ブルーム弧（太く薄く、後ろ） */}
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke + 6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeOpacity={0.22}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        {/* 本体弧 */}
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color: band.text }]}>{clamped}</Text>
        {label ? <Text style={[styles.label, { color: band.text }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloom: { position: 'absolute' },
  center: { position: 'absolute', alignItems: 'center' },
  score: { fontSize: 72, fontWeight: '200', letterSpacing: -2 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 6 },
});
