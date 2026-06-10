import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { AudioModule } from 'expo-audio';
import { isPro, restorePurchases } from '../lib/purchases';
import { theme } from '../lib/theme';
import { NightBackground } from '../components/NightBackground';
import { BottomNav } from '../components/BottomNav';

// legal サイトは Phase 5 で ibiki.starving-effort.com にデプロイ予定。
const PRIVACY_URL = 'https://ibiki.starving-effort.com/privacy';
const TERMS_URL = 'https://ibiki.starving-effort.com/terms';

export default function SettingsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [pro, setPro] = useState(false);
  const [micGranted, setMicGranted] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [p, perm] = await Promise.all([
          isPro(),
          AudioModule.getRecordingPermissionsAsync(),
        ]);
        if (!alive) return;
        setPro(p);
        setMicGranted(perm.granted);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const onRequestMic = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    setMicGranted(perm.granted);
    if (!perm.granted) {
      Alert.alert('マイクが許可されていません', '端末の「設定」アプリからいびきにマイクの使用を許可してね。');
    }
  };

  const onRestore = async () => {
    const ok = await restorePurchases();
    setPro(ok);
    Alert.alert(ok ? '購入を復元しました' : '復元できる購入はありませんでした');
  };

  return (
    <View style={styles.root}>
      <NightBackground width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>設定</Text>

        <View style={styles.card}>
          <Row label="プラン" value={pro ? 'Pro' : '無料'} />
          <Divider />
          <Pressable onPress={() => router.push(pro ? '/guide' : '/paywall')}>
            <Text style={styles.action}>いびき対策ガイド{pro ? '' : '（Pro）'}</Text>
          </Pressable>
          <Divider />
          <Pressable onPress={onRestore}><Text style={styles.action}>購入を復元する</Text></Pressable>
        </View>

        <View style={styles.card}>
          <Row
            label="マイクの許可"
            value={micGranted == null ? '—' : micGranted ? '許可済み' : '未許可'}
            valueColor={micGranted ? theme.good : theme.warn}
          />
          {!micGranted && (
            <>
              <Divider />
              <Pressable onPress={onRequestMic}><Text style={styles.action}>マイクを許可する</Text></Pressable>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
            <Text style={styles.action}>プライバシーポリシー</Text>
          </Pressable>
          <Divider />
          <Pressable onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
            <Text style={styles.action}>利用規約</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>いびき v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        <Text style={styles.privacyNote}>
          録音はこの端末の中だけで処理され、外部に送信されません。
        </Text>
      </ScrollView>
      <BottomNav />
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1 },
  scroll: { padding: 22, gap: 16, paddingBottom: 32 },
  title: { color: theme.text, fontSize: 26, fontWeight: '800', marginTop: 6 },
  card: {
    backgroundColor: theme.bgElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLabel: { color: theme.text, fontSize: 15, fontWeight: '600' },
  rowValue: { color: theme.textDim, fontSize: 15, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  hint: { color: theme.textFaint, fontSize: 12, marginTop: 4, lineHeight: 18 },
  action: { color: theme.accent, fontSize: 15, fontWeight: '700', paddingVertical: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
  version: { color: theme.textFaint, fontSize: 12, textAlign: 'center', marginTop: 8 },
  privacyNote: { color: theme.textFaint, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
