import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SymbolView } from 'expo-symbols';
import { getSession, getEvents, getHighlights, countSessions } from '../../lib/db';
import { isPro } from '../../lib/purchases';
import { shouldShowHardPaywall } from '../../lib/paywall-gate';
import { computeNightlyScore, scoreBandLabel } from '../../lib/scoring';
import { formatDurationJa, formatClock } from '../../lib/format';
import { theme } from '../../lib/theme';
import { ScoreRing } from '../../components/ScoreRing';
import { NightBackground } from '../../components/NightBackground';
import { NightTimeline } from '../../components/NightTimeline';
import { GlassCard } from '../../components/GlassCard';
import type { ClassificationEvent, HighlightClip, RecordingSession } from '../../store/types';

const LABEL_JA: Record<ClassificationEvent['label'], string> = {
  snoring: 'いびき',
  teeth_grinding: '歯ぎしり',
  sleep_talk: '寝言',
  ambient: '環境音',
};

export default function ReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [events, setEvents] = useState<ClassificationEvent[]>([]);
  const [highlights, setHighlights] = useState<HighlightClip[]>([]);
  const [loaded, setLoaded] = useState(false);

  const player = useAudioPlayer(session?.audioFileUri ?? null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      // ハードペイウォール（2夜目以降・非Pro）。録音フロー/履歴ドリル/deep link の
      // どの入口から来てもここで一点強制（plan §5 / Mirrorbite deep-link bypass 教訓）。
      const [pro, sessionCount] = await Promise.all([isPro(), countSessions()]);
      if (shouldShowHardPaywall({ isPro: pro, sessionCount })) {
        router.replace({ pathname: '/paywall', params: { sessionId } });
        return;
      }
      const [s, ev, hl] = await Promise.all([
        getSession(sessionId),
        getEvents(sessionId),
        getHighlights(sessionId),
      ]);
      setSession(s);
      setEvents(ev);
      setHighlights(hl);
      setLoaded(true);
    })();
  }, [sessionId, router]);

  if (!loaded) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}><Text style={styles.dim}>読み込み中…</Text></View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.dim}>レポートが見つかりませんでした。</Text>
          <Pressable onPress={() => router.replace('/')}><Text style={styles.link}>ホームに戻る</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { reason, snoringSec, peakDb } = computeNightlyScore({
    durationSec: session.durationSec,
    events,
  });
  const snoreCount = events.filter((e) => e.label === 'snoring').length;
  const peakLabel = peakDb <= -119 ? '—' : `${Math.round(peakDb)} dB`;

  const playClip = async (clip: HighlightClip) => {
    if (!session.audioFileUri) return;
    await player.seekTo(clip.startSec);
    player.play();
  };

  const onShare = async () => {
    const mins = Math.round(snoringSec / 60);
    await Share.share({
      message:
        `🌙 ゆうべの睡眠サウンドレポート\n` +
        `夜間スコア ${session.nightlyScore}／100\n` +
        `いびき 約${mins}分・最大音量 ${peakLabel}\n` +
        `#いびき`,
    });
  };

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.date}>
            {formatClock(session.startedAt)} – {formatClock(session.endedAt)} の記録
          </Text>
          <Text style={styles.title}>サウンドレポート</Text>
        </View>

        <View style={styles.ringWrap}>
          <ScoreRing score={session.nightlyScore} label={scoreBandLabel(session.nightlyScore)} />
        </View>

        {/* スコアの根拠（WHY）— 健康系の信頼づくり。医療表現なし。 */}
        <GlassCard style={styles.reasonCard}>
          <Text style={styles.reasonText}>{reason}</Text>
        </GlassCard>

        <View style={styles.statsRow}>
          <Stat label="録音時間" value={formatDurationJa(session.durationSec)} />
          <Stat label="いびき" value={formatDurationJa(snoringSec)} />
          <Stat label="最大音量" value={peakLabel} />
        </View>

        <View style={{ marginTop: 18 }}>
          <NightTimeline
            events={events}
            durationSec={session.durationSec}
            startedAt={session.startedAt}
            endedAt={session.endedAt}
          />
        </View>

        <Text style={styles.sectionTitle}>ハイライト</Text>
        {highlights.length === 0 ? (
          <Text style={styles.dim}>目立つ音は記録されませんでした。静かな夜だったみたい。</Text>
        ) : (
          highlights.map((clip) => {
            const playingThis =
              status.playing && Math.abs(status.currentTime - clip.startSec) < 12;
            return (
              <Pressable key={clip.id} style={({ pressed }) => pressed && styles.pressed} onPress={() => playClip(clip)}>
                <GlassCard style={styles.clip}>
                  <View style={styles.playCircle}>
                    <SymbolView
                      name={playingThis ? 'waveform' : 'play.fill'}
                      size={15}
                      tintColor="#D6E2FF"
                      fallback={<Text style={{ color: theme.accent, fontSize: 14 }}>▶</Text>}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clipLabel}>{LABEL_JA[clip.label]}</Text>
                    <Text style={styles.clipMeta}>
                      開始 {formatClock(session.startedAt + clip.startSec * 1000)}・{Math.round(clip.peakDb)} dB
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })
        )}

        <Text style={styles.countNote}>
          いびき {snoreCount} 回・寝言 {events.filter((e) => e.label === 'sleep_talk').length} 回を記録
        </Text>

        <Pressable onPress={onShare} style={({ pressed }) => pressed && styles.pressed}>
          <LinearGradient colors={['#8A97F2', '#6573DC', '#5560C8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shareBtn}>
            <SymbolView name="square.and.arrow.up" size={17} tintColor="#fff" fallback={<Text>↑</Text>} />
            <Text style={styles.shareText}>レポートを共有</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.replace('/')} style={styles.homeBtn}>
          <Text style={styles.link}>ホームに戻る</Text>
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard style={styles.stat} radius={16}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1 },
  scroll: { padding: 22, gap: 13, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  dim: { color: theme.textDim, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  link: { color: theme.accent, fontSize: 15, fontWeight: '700' },
  header: { gap: 5, marginTop: 4 },
  date: { color: theme.textFaint, fontSize: 10.5, fontWeight: '700', letterSpacing: 2.5 },
  title: { color: theme.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  ringWrap: { alignItems: 'center', marginVertical: 2 },
  reasonCard: { padding: 15 },
  reasonText: { color: '#DDE6F8', fontSize: 13.5, lineHeight: 23 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    gap: 5,
  },
  statValue: { color: theme.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  statLabel: { color: theme.textFaint, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.5 },
  sectionTitle: { color: theme.text, fontSize: 14.5, fontWeight: '700', marginTop: 2 },
  clip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60,78,130,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(176,196,255,0.35)',
    shadowColor: '#7C8CF0',
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  clipLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
  clipMeta: { color: theme.textFaint, fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  pressed: { opacity: 0.7 },
  countNote: { color: theme.textDim, fontSize: 13, textAlign: 'center', marginTop: 4 },
  shareBtn: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  shareText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  homeBtn: { alignItems: 'center', paddingVertical: 8 },
});
