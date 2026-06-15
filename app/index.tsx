import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { StorageKeys } from '../lib/storage-keys';
import {
  SLEEP_RECORDING_OPTIONS,
  configureSleepAudioMode,
  ensureMicPermission,
  releaseRecordingAudioMode,
} from '../lib/recording';
import { processRecording } from '../lib/session-pipeline';
import { formatElapsed, dbToMeter } from '../lib/format';
import { theme } from '../lib/theme';
import { NightBackground } from '../components/NightBackground';
import { GlassCard } from '../components/GlassCard';
import { BottomNav } from '../components/BottomNav';
import { SleepOrb } from '../components/SleepOrb';

type Phase = 'idle' | 'recording' | 'processing';

export default function RecordScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const recorder = useAudioRecorder(SLEEP_RECORDING_OPTIONS);
  const state = useAudioRecorderState(recorder, 500);
  const [phase, setPhase] = useState<Phase>('idle');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [procElapsed, setProcElapsed] = useState(0);
  const startedAt = useRef<number>(0);

  // 処理中の経過秒（永久スピナーに見せない・動いていることを伝える）。
  useEffect(() => {
    if (phase !== 'processing') return;
    setProcElapsed(0);
    const t = setInterval(() => setProcElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // 初回起動はオンボへ（O1-O4）。チェックが済むまで描画しない（フラッシュ防止）。
  useEffect(() => {
    (async () => {
      const done = (await AsyncStorage.getItem(StorageKeys.ONBOARDING_DONE)) === '1';
      if (!done) {
        router.replace('/onboarding');
        return;
      }
      setOnboarded(true);
    })();
  }, [router]);

  const onSleep = async () => {
    try {
      const ok = await ensureMicPermission();
      if (!ok) {
        Alert.alert('マイクの許可が必要です', '設定アプリからマイクの使用を許可してね。');
        return;
      }
      await configureSleepAudioMode();
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setPhase('recording');
    } catch (e) {
      console.warn('[ibiki] start failed', e);
      Alert.alert('録音を開始できませんでした', 'もう一度試してね。');
      setPhase('idle');
    }
  };

  const onWake = async () => {
    setPhase('processing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      await releaseRecordingAudioMode();
      if (!uri) {
        Alert.alert('録音が見つかりませんでした', 'もう一度試してね。');
        setPhase('idle');
        return;
      }
      const result = await processRecording({
        audioFileUri: uri,
        startedAt: startedAt.current || Date.now() - state.durationMillis,
        endedAt: Date.now(),
      });
      setPhase('idle');
      // 解析が時間切れでも保存は済んでいるので必ずレポートへ。空の可能性だけ伝える。
      if (result.analysisTimedOut) {
        Alert.alert(
          'レポートを表示します',
          '音の分析に時間がかかったため、一部の結果が含まれていないことがあります。',
        );
      }
      router.push({ pathname: '/report/[sessionId]', params: { sessionId: result.session.id } });
    } catch (e) {
      console.warn('[ibiki] stop/process failed', e);
      Alert.alert('レポートを作成できませんでした', 'もう一度試してね。');
      setPhase('idle');
    }
  };

  const elapsedSec = Math.floor(state.durationMillis / 1000);
  const meter = state.metering != null ? dbToMeter(state.metering) : 0;

  if (onboarded === null) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} variant="landscape" scrim />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {phase === 'idle' && (
          <View style={styles.idle}>
            <View style={styles.top}>
              <Text style={styles.eyebrow}>TONIGHT</Text>
              <Text style={styles.brand}>いびき</Text>
            </View>

            {/* signature: 夜空に浮かぶ「呼吸するガラス球」(v2 = SleepOrb)。 */}
            <View style={styles.orbWrap}>
              <SleepOrb onPress={onSleep} />
            </View>

            <Text style={styles.tagline}>
              枕元に置いて、ボタンを押すだけ。{'\n'}朝、あなたの睡眠サウンドレポートが見られます。
            </Text>
            <View style={styles.privacy}>
              <SymbolView name="lock.fill" size={12} tintColor={theme.textFaint} fallback={<Text>·</Text>} />
              <Text style={styles.privacyT}>録音はこの端末の中だけで処理されます</Text>
            </View>
            <BottomNav />
          </View>
        )}

        {phase === 'recording' && (
          <View style={styles.center}>
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recLabel}>録音中</Text>
            </View>
            <Text style={styles.timer}>{formatElapsed(elapsedSec)}</Text>
            <GlassCard style={styles.meterCard} radius={18}>
              <Text style={styles.meterHint}>いまの音の大きさ</Text>
              <View style={styles.meterTrack}>
                <LinearGradient
                  colors={['#8FB5FF', '#B49CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.meterFill, { width: `${Math.max(2, Math.round(meter * 100))}%` }]}
                />
              </View>
            </GlassCard>
            <Pressable onPress={onWake} style={({ pressed }) => pressed && styles.pressed}>
              <LinearGradient colors={['#8A97F2', '#6573DC', '#5560C8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wakeBtn}>
                <Text style={styles.wakeBtnText}>おはよう</Text>
                <Text style={styles.wakeBtnSub}>録音をとめてレポートを見る</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {phase === 'processing' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.processing}>サウンドレポートを作成中…</Text>
            <Text style={styles.processingSub}>端末の中で音を分析しているよ</Text>
            <Text style={styles.processingTime}>{formatElapsed(procElapsed)}</Text>
            {procElapsed >= 20 && (
              <Text style={styles.processingHint}>
                長く録音した夜ほど、分析に少し時間がかかります。{'\n'}そのままお待ちください。
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1 },
  idle: { flex: 1 },
  top: { alignItems: 'center', paddingTop: 6 },
  eyebrow: { color: theme.accent, fontSize: 10.5, fontWeight: '700', letterSpacing: 4, opacity: 0.75 },
  brand: { color: '#EDF2FF', fontSize: 34, fontWeight: '200', letterSpacing: 14, marginTop: 6, paddingLeft: 14 },

  orbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.78 },

  tagline: { color: theme.textDim, fontSize: 13.5, lineHeight: 25, textAlign: 'center', paddingHorizontal: 44, paddingTop: 6 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12 },
  privacyT: { color: theme.textFaint, fontSize: 11, letterSpacing: 0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 28 },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(150,170,225,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,168,220,0.16)',
  },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF8BA0',
    shadowColor: '#FF8BA0', shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  recLabel: { color: theme.text, fontSize: 12.5, fontWeight: '700', letterSpacing: 3 },
  timer: { color: theme.text, fontSize: 64, fontWeight: '200', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  meterCard: { width: 260, paddingHorizontal: 18, paddingVertical: 14, gap: 10, alignItems: 'center' },
  meterTrack: { width: '100%', height: 7, borderRadius: 4, backgroundColor: 'rgba(20,27,58,0.9)', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 4 },
  meterHint: { color: theme.textFaint, fontSize: 10.5, letterSpacing: 1.5, fontWeight: '600' },
  wakeBtn: { marginTop: 36, paddingHorizontal: 44, paddingVertical: 18, borderRadius: 18, alignItems: 'center', gap: 2 },
  wakeBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  wakeBtnSub: { color: '#fff', fontSize: 12, opacity: 0.85 },
  processing: { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  processingSub: { color: theme.textDim, fontSize: 13 },
  processingTime: { color: theme.textFaint, fontSize: 13, fontVariant: ['tabular-nums'], marginTop: 6 },
  processingHint: { color: theme.textFaint, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 10 },
});
