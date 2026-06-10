import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

// 夜間スコアの円グラフ v2（承認 HTML ibiki-screens-v2.html の RN 移植）。
// 細い 3停止グラデリング + 背面ブルーム + 終端の輝点 + 大きく軽い数字。
const BANDS = {
  good: { stops: ['#B6F2D2', '#7ED9A6', '#3F9E7E'], glow: '#7ED9A6', text: '#9ED9BC', dot: '#D8FFE9' },
  warn: { stops: ['#FFE2B0', '#FFC56B', '#D89638'], glow: '#FFC56B', text: '#FFD79A', dot: '#FFF1D6' },
  danger: { stops: ['#FFC4D0', '#FF8BA0', '#D95E78'], glow: '#FF8BA0', text: '#FFB0C0', dot: '#FFE3E9' },
} as const;

export function ScoreRing({
  score,
  label,
  size = 196,
  stroke = 8,
}: {
  score: number;
  label?: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke - 8) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;
  const band = clamped >= 75 ? BANDS.good : clamped >= 50 ? BANDS.warn : BANDS.danger;
  const cx = size / 2;

  // 終端の輝点（12時起点・時計回りで score% の角度）
  const endAngle = (clamped / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = cx + r * Math.cos(endAngle);
  const dotY = cx + r * Math.sin(endAngle);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={band.stops[0]} />
            <Stop offset="0.55" stopColor={band.stops[1]} />
            <Stop offset="1" stopColor={band.stops[2]} />
          </LinearGradient>
          <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={band.glow} stopOpacity={0.14} />
            <Stop offset="0.7" stopColor={band.glow} stopOpacity={0.05} />
            <Stop offset="1" stopColor={band.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* 背面ブルーム */}
        <Circle cx={cx} cy={cx} r={r * 0.92} fill="url(#bloom)" />
        {/* トラック（内側に1px の締め線） */}
        <Circle cx={cx} cy={cx} r={r} stroke="#141B3A" strokeWidth={stroke} fill="none" />
        <Circle cx={cx} cy={cx} r={r} stroke="#0A0F26" strokeWidth={1} strokeOpacity={0.8} fill="none" />
        {/* 発光の下敷き弧（太く薄く） */}
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke + 7}
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
        {/* 終端の輝点 */}
        <Circle cx={dotX} cy={dotY} r={4.5} fill={band.dot} opacity={0.5} />
        <Circle cx={dotX} cy={dotY} r={2.8} fill={band.dot} />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color: band.text }]}>{clamped}</Text>
        {label ? <Text style={[styles.label, { color: band.text }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center' },
  score: { fontSize: 80, fontWeight: '200', letterSpacing: -3 },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 3, marginTop: 8 },
});
