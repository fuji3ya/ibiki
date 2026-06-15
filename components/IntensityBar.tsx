import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type IntensityBreakdown,
  type IntensityTier,
  TIER_LABEL_JA,
} from '../lib/intensity';
import { formatDurationJa } from '../lib/format';
import { theme } from '../lib/theme';
import { GlassCard } from './GlassCard';

// いびきの強さ4段階内訳（SnoreLab の Quiet/Light/Loud/Epic 相当の signature）。
// 承認 HTML report-v4 の積み上げバー + 凡例 + 主因ノートの RN 移植。
const TIER_COLORS: Record<IntensityTier, [string, string]> = {
  quiet: [theme.tierQuiet, '#7fe6d8'],
  light: [theme.tierLight, '#9cc0ff'],
  loud: [theme.tierLoud, '#ffd08a'],
  epic: [theme.tierEpic, '#ff9fb1'],
};

export function IntensityBar({ data }: { data: IntensityBreakdown }) {
  const { slices, totalSec, dominant } = data;
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.label}>いびきの強さの内訳</Text>
      {totalSec <= 0 ? (
        <Text style={styles.empty}>いびきの音はほとんど記録されませんでした。</Text>
      ) : (
        <>
          <View style={styles.bar}>
            {slices.map((s) =>
              s.sec > 0 ? (
                <LinearGradient
                  key={s.tier}
                  colors={TIER_COLORS[s.tier]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.seg, { flex: Math.max(0.0001, s.pct) }]}
                />
              ) : null
            )}
          </View>
          <View style={styles.legend}>
            {slices.map((s) => (
              <View key={s.tier} style={styles.legItem}>
                <View style={[styles.legDot, { backgroundColor: TIER_COLORS[s.tier][0] }]} />
                <Text style={styles.legName}>{TIER_LABEL_JA[s.tier]}</Text>
                <Text style={styles.legVal}>{s.sec > 0 ? formatDurationJa(s.sec) : '—'}</Text>
              </View>
            ))}
          </View>
          {dominant ? (
            <Text style={styles.domNote}>
              いちばん多かったのは <Text style={styles.domB}>{TIER_LABEL_JA[dominant]}いびき</Text>。
              特大は全体の {Math.round(slices.find((s) => s.tier === 'epic')!.pct)}% でした。
            </Text>
          ) : null}
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  label: { color: theme.textDim, fontSize: 10.5, fontWeight: '700', letterSpacing: 2, marginBottom: 11 },
  empty: { color: theme.textFaint, fontSize: 12.5, lineHeight: 19 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, backgroundColor: 'rgba(20,27,58,0.6)' },
  seg: { height: '100%', borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  legItem: { flex: 1, alignItems: 'center', gap: 5 },
  legDot: { width: 8, height: 8, borderRadius: 3 },
  legName: { color: theme.textDim, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  legVal: { color: theme.text, fontSize: 13, fontWeight: '700' },
  domNote: { color: theme.textFaint, fontSize: 11, lineHeight: 17, marginTop: 12 },
  domB: { color: theme.textDim, fontWeight: '700' },
});
