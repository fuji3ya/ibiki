import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { scoreBand } from '../lib/scoring';
import type { TrendPoint } from '../lib/insights';
import { theme } from '../lib/theme';

// 夜ごとのいびきスコア折れ線（低いほど良い）。承認済み夜デザイン言語:
// グラデ折れ線 + 面のフェード + バンド色のドット。
const BAND_COLOR = { good: theme.good, warn: theme.warn, danger: theme.danger } as const;

export function TrendChart({
  points,
  width,
  height = 150,
}: {
  points: TrendPoint[];
  width: number;
  height?: number;
}) {
  const padX = 16;
  const padTop = 16;
  const padBottom = 26;
  const w = width - padX * 2;
  const h = height - padTop - padBottom;

  const maxScore = Math.max(50, ...points.map((p) => p.score)); // 最低レンジ 0-50
  const x = (i: number) => padX + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (score: number) => padTop + h - (Math.min(score, maxScore) / maxScore) * h;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.score)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${padTop + h} L${x(0)},${padTop + h} Z`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="tline" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8FB5FF" />
            <Stop offset="1" stopColor="#B49CFF" />
          </LinearGradient>
          <LinearGradient id="tfill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8FB5FF" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#8FB5FF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {points.length >= 2 && <Path d={area} fill="url(#tfill)" />}
        {points.length >= 2 && (
          <Path d={line} stroke="url(#tline)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => (
          <Circle key={p.sessionId} cx={x(i)} cy={y(p.score)} r={3.5} fill={BAND_COLOR[scoreBand(p.score)]} />
        ))}
      </Svg>
      <View style={styles.axis}>
        <Text style={styles.axisT}>{points[0]?.date.slice(5).replace('-', '/')}</Text>
        {points.length > 1 && (
          <Text style={styles.axisT}>{points[points.length - 1].date.slice(5).replace('-', '/')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: -18 },
  axisT: { color: theme.textFaint, fontSize: 9.5, letterSpacing: 0.5 },
});
