import { View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';
import { toLocalDateKey } from '../lib/streak';

// 直近 weeks*7 日のカレンダーグリッド。録音した夜が点灯する。
export function StreakGrid({ recordedDates, weeks = 5 }: { recordedDates: Set<string>; weeks?: number }) {
  const days = weeks * 7;
  const today = new Date();
  const cells: { key: string; on: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = toLocalDateKey(d);
    cells.push({ key, on: recordedDates.has(key) });
  }

  // 7 列 × weeks 行に並べる。
  const rows: { key: string; on: boolean }[][] = [];
  for (let r = 0; r < weeks; r++) rows.push(cells.slice(r * 7, r * 7 + 7));

  return (
    <View style={styles.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((c) => (
            <View key={c.key} style={[styles.cell, c.on ? styles.on : styles.off]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 6 },
  on: { backgroundColor: theme.accent },
  off: { backgroundColor: theme.bgElevated2 },
});
