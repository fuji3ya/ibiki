import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { getStreak, listSessions } from '../lib/db';
import { toLocalDateKey } from '../lib/streak';
import { formatClock, formatDurationJa } from '../lib/format';
import { theme } from '../lib/theme';
import { StreakGrid } from '../components/StreakGrid';
import { NightBackground } from '../components/NightBackground';
import { BottomNav } from '../components/BottomNav';
import type { RecordingSession, Streak } from '../store/types';

export default function StreakScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [sessions, setSessions] = useState<RecordingSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [s, list] = await Promise.all([getStreak(), listSessions()]);
        if (!alive) return;
        setStreak(s);
        setSessions(list);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const recorded = new Set(sessions.map((s) => toLocalDateKey(new Date(s.startedAt))));

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>連続記録</Text>

        <View style={styles.streakRow}>
          <View style={styles.streakBox}>
            <SymbolView name="flame.fill" size={26} tintColor={theme.warn} fallback={<Text>🔥</Text>} />
            <Text style={styles.streakNum}>{streak?.current ?? 0}</Text>
            <Text style={styles.streakLabel}>連続</Text>
          </View>
          <View style={styles.streakBox}>
            <SymbolView name="trophy.fill" size={24} tintColor={theme.accent} fallback={<Text>🏆</Text>} />
            <Text style={styles.streakNum}>{streak?.longest ?? 0}</Text>
            <Text style={styles.streakLabel}>最長</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>この5週間</Text>
          <StreakGrid recordedDates={recorded} />
        </View>

        <Text style={styles.sectionTitle}>これまでの記録</Text>
        {sessions.length === 0 ? (
          <Text style={styles.dim}>まだ記録がないよ。今夜、枕元に置いてみよう。</Text>
        ) : (
          sessions.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.sessionRow, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/report/[sessionId]', params: { sessionId: s.id } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDate}>{toLocalDateKey(new Date(s.startedAt))}</Text>
                <Text style={styles.sessionMeta}>
                  {formatClock(s.startedAt)}–{formatClock(s.endedAt)}・{formatDurationJa(s.durationSec)}
                </Text>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scorePillText}>{s.nightlyScore}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <BottomNav />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1 },
  scroll: { padding: 22, gap: 16, paddingBottom: 32 },
  title: { color: theme.text, fontSize: 26, fontWeight: '800', marginTop: 6 },
  streakRow: { flexDirection: 'row', gap: 12 },
  streakBox: {
    flex: 1,
    backgroundColor: theme.bgElevated,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  streakNum: { color: theme.text, fontSize: 30, fontWeight: '800' },
  streakLabel: { color: theme.textFaint, fontSize: 12 },
  card: {
    backgroundColor: theme.bgElevated,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  dim: { color: theme.textDim, fontSize: 14, lineHeight: 22 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgElevated,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  sessionDate: { color: theme.text, fontSize: 15, fontWeight: '700' },
  sessionMeta: { color: theme.textFaint, fontSize: 12, marginTop: 2 },
  scorePill: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.bgElevated2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  scorePillText: { color: theme.text, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
