import { View, Text, StyleSheet } from 'react-native';
import { bucketizeNight, type Intensity } from '../lib/timeline';
import { formatClock } from '../lib/format';
import { theme } from '../lib/theme';
import type { ClassificationEvent } from '../store/types';

// signature: 夜のサウンドタイムライン。一晩のいびき強度を色分けバーで可視化。
// SnoreLab の証明済み型を ibiki の柔らかいオーロラ調パレットで。
const COLORS: Record<Intensity, string> = {
  0: '#3B4670', // 静か
  1: theme.snore, // いびき (violet)
  2: theme.warn, // 大きめ
};
const HEIGHTS: Record<Intensity, number> = { 0: 6, 1: 26, 2: 44 };

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
          <Legend color={COLORS[0]} label="静か" />
          <Legend color={COLORS[1]} label="いびき" />
          <Legend color={COLORS[2]} label="大きめ" />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.bars}>
          {buckets.map((v, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: HEIGHTS[v],
                  backgroundColor: COLORS[v],
                  shadowColor: v === 2 ? theme.warn : 'transparent',
                  shadowOpacity: v === 2 ? 0.7 : 0,
                  shadowRadius: v === 2 ? 4 : 0,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.axis}>
          <Text style={styles.axisT}>{formatClock(startedAt)}</Text>
          <Text style={styles.axisT}>{formatClock(mid)}</Text>
          <Text style={styles.axisT}>{formatClock(endedAt)}</Text>
        </View>
      </View>
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, marginTop: 4 },
  title: { color: theme.text, fontSize: 15, fontWeight: '700' },
  legend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  legendT: { color: theme.textDim, fontSize: 9.5 },
  card: {
    backgroundColor: theme.bgElevated,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 14,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 52 },
  bar: { flex: 1, borderRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisT: { color: theme.textFaint, fontSize: 10 },
});
