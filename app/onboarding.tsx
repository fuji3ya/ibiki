import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureMicPermission } from '../lib/recording';
import { StorageKeys } from '../lib/storage-keys';
import { theme } from '../lib/theme';
import { NightBackground } from '../components/NightBackground';

// オンボ O1-O4（plan §2）。HTML 承認版（ibiki-paywall-onboarding.html）の RN 移植。
// O3 はマイク権限のプリプロンプト：「マイクを許可する」で OS ダイアログを出す。
type Step = {
  icon: SymbolViewProps['name'];
  title: string;
  sub: string;
  cta: string;
  footnote: string;
};

const STEPS: Step[] = [
  {
    icon: 'moon.stars.fill',
    title: 'あなたのいびき、\n聞いたことありますか？',
    sub: '眠っているあいだのことは、自分ではわかりません。\nいびきは、それを聞こえる形にするアプリです。',
    cta: 'つぎへ',
    footnote: '録音はこの端末の中だけで処理されます',
  },
  {
    icon: 'lock.shield.fill',
    title: '録音は、端末の\n中だけで。',
    sub: '音の記録も分析も、すべてこの端末の中で行います。\nクラウドには送信されません。',
    cta: 'つぎへ',
    footnote: 'インターネット接続がなくても使えます',
  },
  {
    icon: 'mic.fill',
    title: '今夜、枕元に\n置くだけ。',
    sub: '就寝中の音を記録するために、\nマイクの使用を許可してください。\n録音は端末の中だけ。外部には送信されません。',
    cta: 'マイクを許可する',
    footnote: 'あとから設定アプリでも変更できます',
  },
  {
    icon: 'sun.horizon.fill',
    title: '明日の朝、\nレポートが届きます。',
    sub: 'いびきが何分あったか、いちばん大きかった音はいつか。\n夜間スコアとハイライトでひと目でわかります。',
    cta: 'はじめる',
    footnote: '毎晩記録すると連続記録がのびていきます',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  const onNext = async () => {
    if (step === 2) {
      // O3: OS のマイク権限ダイアログ。拒否されても先へ進める（録音時に再要求）。
      await ensureMicPermission().catch(() => false);
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    await AsyncStorage.setItem(StorageKeys.ONBOARDING_DONE, '1');
    router.replace('/');
  };

  const onSkip = async () => {
    await AsyncStorage.setItem(StorageKeys.ONBOARDING_DONE, '1');
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.skipRow}>
          <Pressable onPress={onSkip} hitSlop={12}>
            <Text style={styles.skip}>スキップ</Text>
          </Pressable>
        </View>

        <View style={styles.visual}>
          {/* 固定サイズスタックで重ねて centering を構造的に保証（実機 Fabric 対策） */}
          <View style={styles.visualStack}>
            <View style={[styles.halo, styles.halo1]} />
            <View style={[styles.halo, styles.halo2]} />
            <LinearGradient
              colors={['#243056', '#141C34']}
              start={{ x: 0.3, y: 0.2 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.glyph}
            >
              <SymbolView name={s.icon} size={54} tintColor="#BFD2FF" fallback={<Text style={{ fontSize: 40 }}>●</Text>} />
            </LinearGradient>
          </View>
        </View>

        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.sub}>{s.sub}</Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>

        <Pressable onPress={onNext} style={({ pressed }) => pressed && styles.pressed}>
          <LinearGradient colors={['#7C8CF0', '#5C6CD0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.next}>
            <Text style={styles.nextT}>{s.cta}</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.privacy}>
          <SymbolView name="lock.fill" size={11} tintColor={theme.textFaint} fallback={<Text>·</Text>} />
          <Text style={styles.privacyT}>{s.footnote}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1, paddingHorizontal: 26, paddingBottom: 10 },
  skipRow: { alignItems: 'flex-end', paddingTop: 6, height: 28 },
  skip: { color: theme.textFaint, fontSize: 13 },
  visual: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  visualStack: { width: 280, height: 280, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', borderRadius: 999 },
  halo1: { top: 0, left: 0, width: 280, height: 280, backgroundColor: 'rgba(139,180,255,0.10)' },
  halo2: { top: 35, left: 35, width: 210, height: 210, backgroundColor: 'rgba(182,156,255,0.12)' },
  glyph: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: 'rgba(139,180,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C6CD2',
    shadowOpacity: 0.45,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  title: { color: theme.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', lineHeight: 34 },
  sub: { color: theme.textDim, fontSize: 14, lineHeight: 25, textAlign: 'center', marginTop: 12, minHeight: 76 },
  dots: { flexDirection: 'row', gap: 7, justifyContent: 'center', marginVertical: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.bgElevated2 },
  dotOn: { width: 22, backgroundColor: theme.accent },
  next: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nextT: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  privacyT: { color: theme.textFaint, fontSize: 11 },
});
