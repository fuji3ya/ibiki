import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { getOfferings, getPlanPrices, purchasePlan, restorePurchases } from '../lib/purchases';
import { theme } from '../lib/theme';
import { NightBackground } from '../components/NightBackground';
import { GlassCard } from '../components/GlassCard';

// ハードペイウォール（2夜目レポート閲覧時）。HTML 承認版の RN 移植。
// - 価格は StoreKit ライブ値（getPlanPrices、ハードコード禁止・fallback のみ定数）
// - トライアル文言は実際の introPrice がある時だけ出す（ダミー禁止）
// - 入口がどこでも report 画面側で強制されるので、ここは閉じても安全（ホームに戻れる）

const PRIVACY_URL = 'https://ibiki.starving-effort.com/privacy';
const TERMS_URL = 'https://ibiki.starving-effort.com/terms';

type Plan = 'annual' | 'weekly';

const BENEFITS: { icon: SymbolViewProps['name']; text: string }[] = [
  { icon: 'checkmark.circle.fill', text: '毎朝のサウンドレポートを無制限に' },
  { icon: 'play.circle.fill', text: '過去の夜のレポートとハイライトをいつでも再生' },
  { icon: 'lightbulb.fill', text: 'いびき対策ガイド — 今夜からできる7つの工夫' },
  { icon: 'flame.fill', text: '連続記録ストリークと全履歴をずっと' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [plan, setPlan] = useState<Plan>('annual');
  const [prices, setPrices] = useState({ annual: '¥3,800 / 年', weekly: '¥480 / 週' });
  const [hasTrial, setHasTrial] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getPlanPrices();
      setPrices(p);
      // トライアル表記は実際の introPrice（無料期間）がある時だけ（ダミー禁止）。
      try {
        const offering = await getOfferings();
        const ann = offering?.availablePackages.find((x) => x.product.identifier === 'ib_annual_v1');
        setHasTrial(!!ann?.product.introPrice && ann.product.introPrice.price === 0);
      } catch {
        setHasTrial(false);
      }
    })();
  }, []);

  const leave = () => {
    if (sessionId) router.replace({ pathname: '/report/[sessionId]', params: { sessionId } });
    else router.replace('/');
  };

  const onPurchase = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await purchasePlan(plan);
      if (ok) {
        leave();
      }
    } catch (e) {
      console.warn('[ibiki] purchase', e);
      Alert.alert('購入を完了できませんでした', 'もう一度試してね。');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    const ok = await restorePurchases();
    if (ok) leave();
    else Alert.alert('復元できる購入はありませんでした');
  };

  const ctaLabel = plan === 'annual' ? (hasTrial ? '7日間無料で始める' : '年間プランで始める') : '週間プランで始める';

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#2A3A66', '#19223E']}
            start={{ x: 0.3, y: 0.2 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.crown}
          >
            <SymbolView name="moon.stars.fill" size={30} tintColor="#BFD2FF" fallback={<Text>●</Text>} />
          </LinearGradient>
          <Text style={styles.h1}>2夜目からは いびき Pro で</Text>
          <Text style={styles.lead}>
            ゆうべの記録はもう端末の中に。{'\n'}Pro にすると毎朝のレポートがずっと見られます。
          </Text>

          <GlassCard style={styles.benefits} radius={18}>
            {BENEFITS.map((b, i) => (
              <View key={b.text} style={[styles.benefit, i > 0 && styles.benefitDivider]}>
                <View style={styles.benefitIc}>
                  <SymbolView name={b.icon} size={17} tintColor={theme.accent} fallback={<Text>·</Text>} />
                </View>
                <Text style={styles.benefitT}>{b.text}</Text>
              </View>
            ))}
          </GlassCard>

          <View style={styles.plans}>
            <Pressable onPress={() => setPlan('annual')} style={[styles.plan, plan === 'annual' && styles.planSel]}>
              <View style={styles.badge}>
                <Text style={styles.badgeT}>{hasTrial ? '7日間無料 ・ 68% OFF' : '68% OFF'}</Text>
              </View>
              <View style={[styles.radio, plan === 'annual' && styles.radioOn]} />
              <View>
                <Text style={styles.planNm}>年間プラン</Text>
                <Text style={styles.planMeta}>{hasTrial ? '7日間の無料トライアル付き' : 'いちばん人気'}</Text>
              </View>
              <View style={styles.price}>
                <Text style={styles.priceV}>{prices.annual.replace(' / 年', '')}</Text>
                <Text style={styles.priceU}>/ 年（週あたり約¥73）</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => setPlan('weekly')} style={[styles.plan, plan === 'weekly' && styles.planSel]}>
              <View style={[styles.radio, plan === 'weekly' && styles.radioOn]} />
              <View>
                <Text style={styles.planNm}>週間プラン</Text>
                <Text style={styles.planMeta}>気軽に試したい方に</Text>
              </View>
              <View style={styles.price}>
                <Text style={styles.priceV}>{prices.weekly.replace(' / 週', '')}</Text>
                <Text style={styles.priceU}>/ 週</Text>
              </View>
            </Pressable>
          </View>

          <Pressable onPress={onPurchase} disabled={busy} style={({ pressed }) => (pressed || busy) && styles.pressed}>
            <LinearGradient colors={['#8A97F2', '#6573DC', '#5560C8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaT}>{busy ? '処理中…' : ctaLabel}</Text>
            </LinearGradient>
          </Pressable>

          {hasTrial && (
            <Text style={styles.fine}>無料期間終了の24時間前までに解約すれば料金はかかりません。</Text>
          )}
          <View style={styles.links}>
            <Pressable onPress={onRestore}><Text style={styles.link}>購入を復元</Text></Pressable>
            <Text style={styles.linkSep}>・</Text>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}><Text style={styles.link}>利用規約</Text></Pressable>
            <Text style={styles.linkSep}>・</Text>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}><Text style={styles.link}>プライバシー</Text></Pressable>
          </View>

          <Pressable onPress={() => router.replace('/')} style={styles.homeBtn} hitSlop={10}>
            <Text style={styles.homeT}>ホームに戻る</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24 },
  crown: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,180,255,0.35)',
    shadowColor: '#7C6CD2',
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  h1: { color: theme.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', marginTop: 14 },
  lead: { color: theme.textDim, fontSize: 13.5, lineHeight: 22, textAlign: 'center', marginTop: 7 },
  benefits: { marginTop: 18, paddingHorizontal: 16 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  benefitDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.06)' },
  benefitIc: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,180,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(176,196,255,0.18)',
  },
  benefitT: { color: theme.text, fontSize: 14, lineHeight: 20, flex: 1 },
  plans: { marginTop: 18, gap: 10 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(120,140,200,0.06)',
    borderWidth: 1.5,
    borderColor: theme.glassBorder,
  },
  planSel: {
    borderColor: theme.accent,
    backgroundColor: 'rgba(140,160,230,0.13)',
    shadowColor: '#7C8CF0',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.textFaint },
  radioOn: { borderColor: theme.accent, backgroundColor: theme.accent },
  planNm: { color: theme.text, fontSize: 15, fontWeight: '800' },
  planMeta: { color: theme.textDim, fontSize: 11.5, marginTop: 3 },
  price: { marginLeft: 'auto', alignItems: 'flex-end' },
  priceV: { color: theme.text, fontSize: 16, fontWeight: '800' },
  priceU: { color: theme.textFaint, fontSize: 10.5, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -9,
    right: 14,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.warn,
  },
  badgeT: { color: '#1A1330', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cta: { marginTop: 16, height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  ctaT: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  fine: { color: theme.textFaint, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 12 },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  link: { color: theme.textDim, fontSize: 11, textDecorationLine: 'underline' },
  linkSep: { color: theme.textFaint, fontSize: 11 },
  homeBtn: { alignItems: 'center', marginTop: 18 },
  homeT: { color: theme.textFaint, fontSize: 12.5 },
});
