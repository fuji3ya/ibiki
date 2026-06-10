import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { listSessions, getAllSessionRemedies } from '../lib/db';
import { isPro } from '../lib/purchases';
import { buildTrendSeries, computeRemedyEffects, type RemedyEffect, type TrendPoint } from '../lib/insights';
import { toLocalDateKey } from '../lib/streak';
import { GUIDE_TIPS } from '../lib/guide-content';
import { theme } from '../lib/theme';
import { NightBackground } from '../components/NightBackground';
import { GlassCard } from '../components/GlassCard';
import { TrendChart } from '../components/TrendChart';
import { BottomNav } from '../components/BottomNav';

// トレンド（Pro の核・競合リサーチ 2026-06-10 の最優先機能）。
// 夜ごとのいびきスコア推移 + 「対策×効果」の比較。ゲートは本画面で強制。
const TIP_TITLE = new Map(GUIDE_TIPS.map((t) => [t.id, t.title]));

export default function TrendsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [effects, setEffects] = useState<RemedyEffect[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const pro = await isPro();
        if (!alive) return;
        if (!pro) {
          router.replace('/paywall');
          return;
        }
        const [sessions, tags] = await Promise.all([listSessions(), getAllSessionRemedies()]);
        if (!alive) return;
        setPoints(buildTrendSeries(sessions, toLocalDateKey, 14));
        setEffects(computeRemedyEffects(sessions, tags));
        setAllowed(true);
      })();
      return () => {
        alive = false;
      };
    }, [router])
  );

  if (!allowed) {
    return <View style={styles.root} />;
  }

  const chartWidth = width - 44 - 28; // padding + card padding

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>トレンド</Text>
          <Text style={styles.lead}>いびきスコアの推移（低いほど静かな夜）</Text>

          <GlassCard style={styles.chartCard}>
            {points.length >= 2 ? (
              <TrendChart points={points} width={chartWidth} />
            ) : (
              <View style={styles.empty}>
                <SymbolView name="chart.xyaxis.line" size={28} tintColor={theme.textFaint} fallback={<Text>·</Text>} />
                <Text style={styles.emptyT}>
                  2夜分の記録がたまるとグラフが表示されます。{'\n'}今夜も枕元に置いて眠ってみてね。
                </Text>
              </View>
            )}
          </GlassCard>

          <Text style={styles.sectionTitle}>対策の効果</Text>
          {effects.length === 0 ? (
            <GlassCard style={styles.effectEmpty}>
              <Text style={styles.emptyT}>
                レポートで「この夜に試したこと」をタグ付けすると、{'\n'}試した夜とそうでない夜のスコアをここで比較できます。
              </Text>
            </GlassCard>
          ) : (
            effects.map((e) => {
              const better = e.delta < 0;
              return (
                <GlassCard key={e.remedyId} style={styles.effectRow} radius={16}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.effectName}>{TIP_TITLE.get(e.remedyId) ?? e.remedyId}</Text>
                    <Text style={styles.effectMeta}>
                      試した夜 {e.nightsWith}回 平均{e.avgWith} ／ 試してない夜 平均{e.avgWithout}
                    </Text>
                  </View>
                  <View style={[styles.deltaPill, better ? styles.deltaGood : styles.deltaBad]}>
                    <SymbolView
                      name={better ? 'arrow.down.right' : 'arrow.up.right'}
                      size={11}
                      tintColor={better ? '#0E2A1D' : '#3A1320'}
                      fallback={<Text>{better ? '↓' : '↑'}</Text>}
                    />
                    <Text style={[styles.deltaT, { color: better ? '#0E2A1D' : '#3A1320' }]}>
                      {better ? '' : '+'}{e.delta}
                    </Text>
                  </View>
                </GlassCard>
              );
            })
          )}
          <Text style={styles.note}>
            スコア差は参考情報です。夜ごとの環境差もあるため、数夜分のデータでくらべるのがおすすめです。
          </Text>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1 },
  scroll: { padding: 22, gap: 12, paddingBottom: 24 },
  title: { color: theme.text, fontSize: 26, fontWeight: '800', marginTop: 6 },
  lead: { color: theme.textDim, fontSize: 13, marginTop: -6 },
  chartCard: { paddingVertical: 14, paddingHorizontal: 14 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  emptyT: { color: theme.textDim, fontSize: 12.5, lineHeight: 20, textAlign: 'center' },
  sectionTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
  effectEmpty: { padding: 18 },
  effectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15 },
  effectName: { color: theme.text, fontSize: 14, fontWeight: '700' },
  effectMeta: { color: theme.textFaint, fontSize: 11, marginTop: 3 },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deltaGood: { backgroundColor: theme.good },
  deltaBad: { backgroundColor: theme.danger },
  deltaT: { fontSize: 12.5, fontWeight: '800' },
  note: { color: theme.textFaint, fontSize: 10.5, lineHeight: 17, textAlign: 'center', marginTop: 6 },
});
