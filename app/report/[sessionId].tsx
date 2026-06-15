import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SymbolView } from 'expo-symbols';
import {
  getSession,
  getEvents,
  getHighlights,
  countSessions,
  listSessions,
  getSessionRemedies,
  setSessionRemedies,
} from '../../lib/db';
import { isPro } from '../../lib/purchases';
import { shouldShowHardPaywall } from '../../lib/paywall-gate';
import { computeNightlyScore, scoreBandLabel } from '../../lib/scoring';
import { computeIntensityBreakdown } from '../../lib/intensity';
import { computeScoreDelta, summarizeNight, type ScoreDelta } from '../../lib/insights';
import { GUIDE_TIPS } from '../../lib/guide-content';
import { formatDurationJa, formatClock } from '../../lib/format';
import { theme } from '../../lib/theme';
import { ScoreRing } from '../../components/ScoreRing';
import { NightBackground } from '../../components/NightBackground';
import { NightTimeline } from '../../components/NightTimeline';
import { IntensityBar } from '../../components/IntensityBar';
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
  // 再生中のクリップ id（トグル停止 + 再生中の見た目に使う）
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  // この夜に試した対策のタグ（トレンドの効果分析に使う）
  const [remedies, setRemedies] = useState<string[]>([]);
  // 前夜・平均との差分（単発レポートをトレンドに繋ぐ）
  const [delta, setDelta] = useState<ScoreDelta | null>(null);

  const player = useAudioPlayer(session?.audioFileUri ?? null);
  const status = useAudioPlayerStatus(player);

  // ハイライトは「クリップ開始から CLIP_WINDOW_SEC」だけ再生して自動停止する
  // （止める手段が無い/夜通し流れ続ける、の実機フィードバック対応）。
  const CLIP_WINDOW_SEC = 15;
  const playingClip = highlights.find((h) => h.id === playingClipId) ?? null;
  useEffect(() => {
    if (!playingClip) return;
    if (!status.playing) return;
    if (status.currentTime >= playingClip.startSec + CLIP_WINDOW_SEC) {
      player.pause();
      setPlayingClipId(null);
    }
  }, [status.currentTime, status.playing, playingClip, player]);
  // 端まで再生し切った場合もリセット
  useEffect(() => {
    if (!status.playing && playingClipId && status.didJustFinish) {
      setPlayingClipId(null);
    }
  }, [status.playing, status.didJustFinish, playingClipId]);

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
      const [s, ev, hl, rem, all] = await Promise.all([
        getSession(sessionId),
        getEvents(sessionId),
        getHighlights(sessionId),
        getSessionRemedies(sessionId),
        listSessions(),
      ]);
      setSession(s);
      setEvents(ev);
      setHighlights(hl);
      setRemedies(rem);
      // この夜より前のセッションのスコアを新しい順で渡し、前夜/平均との差分を出す。
      if (s) {
        const priorNewestFirst = all
          .filter((x) => x.startedAt < s.startedAt)
          .sort((a, b) => b.startedAt - a.startedAt)
          .map((x) => x.nightlyScore);
        setDelta(computeScoreDelta(s.nightlyScore, priorNewestFirst));
      }
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
  const breakdown = computeIntensityBreakdown(events);
  const insight = summarizeNight(events, session.durationSec);
  // 差分ピル: 負 = 静かになった(改善)。前夜が無ければ出さない。
  const deltaPrev = delta?.deltaPrev ?? null;
  const peakClock =
    insight.peakStartSec != null ? formatClock(session.startedAt + insight.peakStartSec * 1000) : null;
  const peakEndClock =
    insight.peakStartSec != null
      ? formatClock(session.startedAt + (insight.peakStartSec + 3600) * 1000)
      : null;

  const toggleRemedy = async (id: string) => {
    if (!sessionId) return;
    const next = remedies.includes(id) ? remedies.filter((r) => r !== id) : [...remedies, id];
    setRemedies(next);
    await setSessionRemedies(sessionId, next);
  };

  const playClip = async (clip: HighlightClip) => {
    if (!session.audioFileUri) return;
    // 同じクリップをもう一度タップ → 停止（トグル）
    if (playingClipId === clip.id && status.playing) {
      player.pause();
      setPlayingClipId(null);
      return;
    }
    await player.seekTo(clip.startSec);
    player.play();
    setPlayingClipId(clip.id);
  };

  const onShare = async () => {
    const mins = Math.round(snoringSec / 60);
    await Share.share({
      message:
        `🌙 ゆうべの睡眠サウンドレポート\n` +
        `いびきスコア ${session.nightlyScore}（低いほど静か）\n` +
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
          <Text style={styles.scoreKind}>いびきスコア</Text>
          <ScoreRing score={session.nightlyScore} label={scoreBandLabel(session.nightlyScore)} />
          {deltaPrev != null && deltaPrev !== 0 && (
            <View style={[styles.deltaPill, deltaPrev < 0 ? styles.deltaGood : styles.deltaUp]}>
              <SymbolView
                name={deltaPrev < 0 ? 'arrow.down' : 'arrow.up'}
                size={12}
                tintColor={deltaPrev < 0 ? theme.good : theme.warn}
                fallback={<Text style={{ color: deltaPrev < 0 ? theme.good : theme.warn }}>{deltaPrev < 0 ? '↓' : '↑'}</Text>}
              />
              <Text style={styles.deltaText}>
                前夜より {Math.abs(deltaPrev)} {deltaPrev < 0 ? 'すくない・静かな夜' : '多め'}
              </Text>
            </View>
          )}
          <Text style={styles.scoreKindNote}>いびきの音量 × 時間で算出（低いほど静かな夜）</Text>
        </View>

        {/* スコアの根拠（WHY）— 健康系の信頼づくり。医療表現なし。 */}
        <GlassCard style={styles.reasonCard}>
          <Text style={styles.reasonText}>{reason}</Text>
        </GlassCard>

        {/* いびきの強さ4段階内訳（signature の深み） */}
        <IntensityBar data={breakdown} />

        {/* 夜の読み解きインサイト（最盛時間帯 + 最長の静寂） */}
        {breakdown.totalSec > 0 && peakClock && (
          <GlassCard style={styles.insightCard}>
            <View style={styles.insightIc}>
              <SymbolView name="moon.stars.fill" size={17} tintColor="#BFD2FF" fallback={<Text>·</Text>} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightT}>{peakClock} ごろが、いちばん多めでした</Text>
              {insight.longestQuietMin > 0 && (
                <Text style={styles.insightS}>
                  最長 {formatDurationJa(insight.longestQuietMin * 60)} はとても静かでした。
                </Text>
              )}
            </View>
          </GlassCard>
        )}

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
            const playingThis = playingClipId === clip.id && status.playing;
            return (
              <Pressable key={clip.id} style={({ pressed }) => pressed && styles.pressed} onPress={() => playClip(clip)}>
                <GlassCard style={styles.clip}>
                  <View style={[styles.playCircle, playingThis && styles.playCircleActive]}>
                    <SymbolView
                      name={playingThis ? 'stop.fill' : 'play.fill'}
                      size={15}
                      tintColor="#D6E2FF"
                      fallback={<Text style={{ color: theme.accent, fontSize: 14 }}>{playingThis ? '■' : '▶'}</Text>}
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

        {/* 対策×効果トラッキング: この夜に試した対策をタグ付け → トレンドで効果を比較 */}
        <Text style={styles.sectionTitle}>この夜に試したこと</Text>
        <GlassCard style={styles.remedyCard}>
          <View style={styles.chips}>
            {GUIDE_TIPS.map((tip) => {
              const on = remedies.includes(tip.id);
              return (
                <Pressable
                  key={tip.id}
                  onPress={() => toggleRemedy(tip.id)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipT, on && styles.chipTOn]}>{tip.title}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.remedyHint}>タグ付けすると、トレンドで「試した夜」と「試してない夜」のスコアをくらべられます</Text>
        </GlassCard>

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
  ringWrap: { alignItems: 'center', marginVertical: 2, gap: 2 },
  scoreKind: { color: theme.textDim, fontSize: 11.5, fontWeight: '700', letterSpacing: 2.5 },
  scoreKindNote: { color: theme.textFaint, fontSize: 10.5, letterSpacing: 0.3 },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
  },
  deltaGood: { backgroundColor: 'rgba(126,217,166,0.12)', borderColor: 'rgba(126,217,166,0.30)' },
  deltaUp: { backgroundColor: 'rgba(255,197,107,0.12)', borderColor: 'rgba(255,197,107,0.30)' },
  deltaText: { color: '#CFE9DA', fontSize: 12.5, fontWeight: '600' },
  reasonCard: { padding: 15 },
  reasonText: { color: '#DDE6F8', fontSize: 13.5, lineHeight: 23 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  insightIc: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143,181,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(176,196,255,0.18)',
  },
  insightT: { color: theme.text, fontSize: 13, fontWeight: '700' },
  insightS: { color: theme.textDim, fontSize: 12, lineHeight: 18, marginTop: 3 },
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
  playCircleActive: {
    backgroundColor: 'rgba(124,140,240,0.45)',
    borderColor: 'rgba(176,196,255,0.7)',
    shadowOpacity: 0.6,
  },
  clipLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
  clipMeta: { color: theme.textFaint, fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  pressed: { opacity: 0.7 },
  countNote: { color: theme.textDim, fontSize: 13, textAlign: 'center', marginTop: 4 },
  remedyCard: { padding: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    backgroundColor: 'rgba(120,140,200,0.06)',
  },
  chipOn: {
    borderColor: theme.accent,
    backgroundColor: 'rgba(140,160,230,0.18)',
  },
  chipT: { color: theme.textDim, fontSize: 12.5, fontWeight: '600' },
  chipTOn: { color: theme.text, fontWeight: '700' },
  remedyHint: { color: theme.textFaint, fontSize: 10.5, lineHeight: 16, marginTop: 11 },
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
