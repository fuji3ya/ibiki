import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as FileSystem from 'expo-file-system';
import { getStreak, listSessions, deleteSession } from '../lib/db';
import { toLocalDateKey } from '../lib/streak';
import { formatClock, formatDurationJa } from '../lib/format';
import { theme } from '../lib/theme';
import { StreakGrid } from '../components/StreakGrid';
import { GlassCard } from '../components/GlassCard';
import { NightBackground } from '../components/NightBackground';
import { BottomNav } from '../components/BottomNav';
import type { RecordingSession, Streak } from '../store/types';

export default function StreakScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [sessions, setSessions] = useState<RecordingSession[]>([]);

  const load = useCallback(async () => {
    const [s, list] = await Promise.all([getStreak(), listSessions()]);
    setStreak(s);
    setSessions(list);
  }, []);

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

  // この日だけ削除（取り消し不可なので確認を挟む）。音源も消して一覧を更新。
  const onDeleteRow = (s: RecordingSession) => {
    const dateKey = toLocalDateKey(new Date(s.startedAt));
    Alert.alert('この記録を削除', `${dateKey} の記録を削除します。取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            if (s.audioFileUri) {
              try {
                await FileSystem.deleteAsync(s.audioFileUri, { idempotent: true });
              } catch {
                /* ファイルが無くても無視 */
              }
            }
            await deleteSession(s.id);
          } catch (e) {
            console.warn('[ibiki] deleteSession', e);
          }
          await load();
        },
      },
    ]);
  };

  const recorded = new Set(sessions.map((s) => toLocalDateKey(new Date(s.startedAt))));

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>連続記録</Text>

        <View style={styles.streakRow}>
          <GlassCard style={styles.streakBox} radius={16}>
            <SymbolView name="flame.fill" size={26} tintColor={theme.warn} fallback={<Text>🔥</Text>} />
            <Text style={styles.streakNum}>{streak?.current ?? 0}</Text>
            <Text style={styles.streakLabel}>連続</Text>
          </GlassCard>
          <GlassCard style={styles.streakBox} radius={16}>
            <SymbolView name="trophy.fill" size={24} tintColor={theme.accent} fallback={<Text>🏆</Text>} />
            <Text style={styles.streakNum}>{streak?.longest ?? 0}</Text>
            <Text style={styles.streakLabel}>最長</Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>この5週間</Text>
          <StreakGrid recordedDates={recorded} />
        </GlassCard>

        <Text style={styles.sectionTitle}>これまでの記録</Text>
        {sessions.length === 0 ? (
          <Text style={styles.dim}>まだ記録がないよ。今夜、枕元に置いてみよう。</Text>
        ) : (
          sessions.map((s) => (
            <GlassCard key={s.id} style={styles.sessionRow} radius={16}>
              <Pressable
                style={({ pressed }) => [styles.sessionMain, pressed && styles.pressed]}
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
              <Pressable onPress={() => onDeleteRow(s)} hitSlop={8} style={({ pressed }) => [styles.trashBtn, pressed && styles.pressed]}>
                <SymbolView name="trash" size={16} tintColor={theme.textFaint} fallback={<Text style={{ color: theme.textFaint }}>✕</Text>} />
              </Pressable>
            </GlassCard>
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
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  streakNum: { color: theme.text, fontSize: 30, fontWeight: '800' },
  streakLabel: { color: theme.textFaint, fontSize: 12 },
  card: { padding: 16, gap: 12 },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  dim: { color: theme.textDim, fontSize: 14, lineHeight: 22 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  sessionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trashBtn: { paddingLeft: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  sessionDate: { color: theme.text, fontSize: 15, fontWeight: '700' },
  sessionMeta: { color: theme.textFaint, fontSize: 12, marginTop: 2 },
  scorePill: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(60,78,130,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(176,196,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  scorePillText: { color: theme.text, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
