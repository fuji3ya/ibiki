import { useRef, useState } from 'react';
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
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
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
import { BottomNav } from '../components/BottomNav';

type Phase = 'idle' | 'recording' | 'processing';

export default function RecordScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const recorder = useAudioRecorder(SLEEP_RECORDING_OPTIONS);
  const state = useAudioRecorderState(recorder, 500);
  const [phase, setPhase] = useState<Phase>('idle');
  const startedAt = useRef<number>(0);

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
      router.push({ pathname: '/report/[sessionId]', params: { sessionId: result.session.id } });
    } catch (e) {
      console.warn('[ibiki] stop/process failed', e);
      Alert.alert('レポートを作成できませんでした', 'もう一度試してね。');
      setPhase('idle');
    }
  };

  const elapsedSec = Math.floor(state.durationMillis / 1000);
  const meter = state.metering != null ? dbToMeter(state.metering) : 0;

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {phase === 'idle' && (
          <View style={styles.idle}>
            <View style={styles.top}>
              <Text style={styles.eyebrow}>TONIGHT</Text>
              <Text style={styles.brand}>いびき</Text>
            </View>

            {/* signature: 夜に呼吸するオーブ */}
            <View style={styles.orbWrap}>
              <View style={[styles.halo, styles.halo1]} />
              <View style={[styles.halo, styles.halo2]} />
              <View style={styles.ring1} />
              <View style={styles.ring2} />
              <Pressable onPress={onSleep} style={({ pressed }) => pressed && styles.pressed}>
                <LinearGradient
                  colors={['#243056', '#141C34']}
                  start={{ x: 0.3, y: 0.2 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.orbBtn}
                >
                  <SymbolView name="moon.stars.fill" size={38} tintColor="#BFD2FF" fallback={<Text style={{ fontSize: 30 }}>🌙</Text>} />
                  <Text style={styles.orbLabel}>おやすみ</Text>
                  <Text style={styles.orbSub}>録音をはじめる</Text>
                </LinearGradient>
              </Pressable>
            </View>

            <Text style={styles.tagline}>
              枕元に置いて、ボタンを押すだけ。{'\n'}朝、あなたの睡眠サウンドレポートが見られます。
            </Text>
            <View style={styles.privacy}>
              <SymbolView name="lock.fill" size={12} tintColor={theme.textFaint} fallback={<Text>🔒</Text>} />
              <Text style={styles.privacyT}>録音はこの端末の中だけで処理されます</Text>
            </View>
            <BottomNav />
          </View>
        )}

        {phase === 'recording' && (
          <View style={styles.center}>
            <Text style={styles.recLabel}>録音中</Text>
            <Text style={styles.timer}>{formatElapsed(elapsedSec)}</Text>
            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: `${Math.round(meter * 100)}%` }]} />
            </View>
            <Text style={styles.meterHint}>いまの音の大きさ</Text>
            <Pressable onPress={onWake} style={({ pressed }) => pressed && styles.pressed}>
              <LinearGradient colors={['#7C8CF0', '#5C6CD0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wakeBtn}>
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
  top: { alignItems: 'center', paddingTop: 8 },
  eyebrow: { color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.85 },
  brand: { color: '#F4F7FF', fontSize: 30, fontWeight: '800', letterSpacing: 5, marginTop: 8 },

  orbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', borderRadius: 999 },
  halo1: { width: 300, height: 300, backgroundColor: 'rgba(139,180,255,0.10)' },
  halo2: { width: 232, height: 232, backgroundColor: 'rgba(182,156,255,0.12)' },
  ring1: { position: 'absolute', width: 264, height: 264, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(139,180,255,0.18)' },
  ring2: { position: 'absolute', width: 200, height: 200, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(182,156,255,0.20)' },
  orbBtn: {
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 1,
    borderColor: 'rgba(139,180,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: '#7C6CD2',
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  orbLabel: { color: '#fff', fontSize: 25, fontWeight: '800', letterSpacing: 1 },
  orbSub: { color: theme.accent, fontSize: 12, letterSpacing: 1 },
  pressed: { opacity: 0.75 },

  tagline: { color: theme.textDim, fontSize: 13.5, lineHeight: 24, textAlign: 'center', paddingHorizontal: 40 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 16 },
  privacyT: { color: theme.textFaint, fontSize: 11.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28 },
  recLabel: { color: theme.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  timer: { color: theme.text, fontSize: 52, fontWeight: '200', fontVariant: ['tabular-nums'] },
  meterTrack: { width: 220, height: 8, borderRadius: 4, backgroundColor: theme.bgElevated, overflow: 'hidden', marginTop: 8 },
  meterFill: { height: '100%', backgroundColor: theme.accent, borderRadius: 4 },
  meterHint: { color: theme.textFaint, fontSize: 12 },
  wakeBtn: { marginTop: 36, paddingHorizontal: 44, paddingVertical: 18, borderRadius: 18, alignItems: 'center', gap: 2 },
  wakeBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  wakeBtnSub: { color: '#fff', fontSize: 12, opacity: 0.85 },
  processing: { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  processingSub: { color: theme.textDim, fontSize: 13 },
});
