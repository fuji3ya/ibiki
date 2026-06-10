import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { bucketizeNight, type Intensity } from '../lib/timeline';
import { formatClock } from '../lib/format';
import { theme } from '../lib/theme';
import { GlassCard } from './GlassCard';
import type { ClassificationEvent } from '../store/types';

// signature: 夜のサウンドタイムライン v2。
// バーを縦グラデ + 大きめの音に発光、カードはガラス質感（承認 HTML v2 移植）。
const CONF: Record<Intensity, { h: number; colors: [string, string]; glow?: string }> = {
  0: { h: 8, colors: ['#3D4977', '#2B3458'] },
  1: { h: 30, colors: ['#C9B6FF', '#9D84E8'], glow: 'rgba(180,156,255,0.45)' },
  2: { h: 52, colors: ['#FFD89A', '#EFA94E'], glow: 'rgba(255,197,107,0.65)' },
};

export function NightTimeline({
  events,
  durationSec,
  startedAt,
  endedAt,
}: {
  events: ClassificationEvent[];
  durationSec: number;
  startedAt: number;
  endedAt: number;
}) {
  const buckets = bucketizeNight(events, durationSec, 60);
  const mid = startedAt + (endedAt - startedAt) / 2;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.title}>夜のサウンド</Text>
        <View style={styles.legend}>
          <Legend color="#39456F" label="静か" />
          <Legend color={theme.snore} label="いびき" />
          <Legend color={theme.warn} label="大きめ" />
        </View>
      </View>
      <GlassCard style={styles.card}>
        <View style={styles.bars}>
          {buckets.map((v, i) => {
            const c = CONF[v];
            return (
              <LinearGradient
                key={i}
                colors={c.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.bar,
                  {
                    height: c.h,
                    shadowColor: c.glow ? c.colors[0] : 'transparent',
                    shadowOpacity: c.glow ? 0.7 : 0,
                    shadowRadius: v === 2 ? 6 : 4,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.axis}>
          <Text style={styles.axisT}>{formatClock(startedAt)}</Text>
          <Text style={styles.axisT}>{formatClock(mid)}</Text>
          <Text style={styles.axisT}>{formatClock(endedAt)}</Text>
        </View>
      </GlassCard>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendT}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  title: { color: theme.text, fontSize: 14.5, fontWeight: '700', letterSpacing: 0.2 },
  legend: { flexDirection: 'row', gap: 11 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendT: { color: theme.textDim, fontSize: 9, letterSpacing: 0.5 },
  card: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 9 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2.5, height: 58 },
  bar: { flex: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderBottomLeftRadius: 1, borderBottomRightRadius: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  axisT: { color: theme.textFaint, fontSize: 9.5, letterSpacing: 0.5 },
});
