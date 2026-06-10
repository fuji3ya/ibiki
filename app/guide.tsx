import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { isPro } from '../lib/purchases';
import { GUIDE_TIPS, GUIDE_FOOTER } from '../lib/guide-content';
import { theme } from '../lib/theme';
import { NightBackground } from '../components/NightBackground';

// いびき対策ガイド（Pro 特典）。ゲートは本画面で強制（deep link でも素通りさせない）。
export default function GuideScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [allowed, setAllowed] = useState<boolean | null>(null);

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

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.nav}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
              <SymbolView name="chevron.left" size={22} tintColor={theme.accent} fallback={<Text style={{ color: theme.accent }}>‹</Text>} />
            </Pressable>
          </View>
          <Text style={styles.title}>いびき対策ガイド</Text>
          <Text style={styles.lead}>今夜からできる7つの工夫。レポートとくらべながら、合うものを見つけてね。</Text>

          {GUIDE_TIPS.map((tip, i) => (
            <View key={tip.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardIc}>
                  <SymbolView name={tip.icon as SymbolViewProps['name']} size={18} tintColor={theme.accent} fallback={<Text>·</Text>} />
                </View>
                <Text style={styles.cardNo}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={styles.cardTitle}>{tip.title}</Text>
              </View>
              <Text style={styles.cardWhy}>{tip.why}</Text>
              <View style={styles.actionRow}>
                <SymbolView name="arrow.right.circle.fill" size={14} tintColor={theme.good} fallback={<Text>→</Text>} />
                <Text style={styles.cardAction}>{tip.action}</Text>
              </View>
            </View>
          ))}

          <Text style={styles.footer}>{GUIDE_FOOTER}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },
  nav: { height: 44, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  lead: { color: theme.textDim, fontSize: 13.5, lineHeight: 22, marginTop: 6, marginBottom: 16 },
  card: {
    backgroundColor: theme.bgElevated,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIc: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,180,255,0.12)',
  },
  cardNo: { color: theme.textFaint, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { color: theme.text, fontSize: 15.5, fontWeight: '800', flex: 1 },
  cardWhy: { color: theme.textDim, fontSize: 13, lineHeight: 21, marginTop: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 10 },
  cardAction: { color: theme.text, fontSize: 13, lineHeight: 21, flex: 1 },
  footer: { color: theme.textFaint, fontSize: 11, lineHeight: 19, marginTop: 14, textAlign: 'center' },
});
