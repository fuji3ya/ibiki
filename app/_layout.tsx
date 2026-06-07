import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initPurchases } from '../lib/purchases';

// Safety net: release ビルドで未捕捉の JS error（async/microtask 含む）が
// RCTFatal → SIGABRT のハードクラッシュに昇格するのを防ぎ、画面で診断できるようにする。
{
  const g = globalThis as any;
  if (g?.ErrorUtils?.setGlobalHandler && !g.__ibikiGuard) {
    g.__ibikiGuard = true;
    const prev = g.ErrorUtils.getGlobalHandler?.();
    g.ErrorUtils.setGlobalHandler((e: any, isFatal?: boolean) => {
      console.warn('[ibiki] caught', isFatal ? 'FATAL' : 'error', e?.message, '\n', e?.stack);
      if (!isFatal && typeof prev === 'function') prev(e, isFatal);
    });
  }
}

export default function RootLayout() {
  useEffect(() => {
    // RC 未設定でも mock モードで安全に解決する（throw しない）。
    initPurchases().catch((e) => console.warn('[ibiki] initPurchases', e?.message));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* ルートは file tree から自動登録。Stack.Screen を列挙しない
          （解決できない name は phantom screen を生んで起動クラッシュする）。*/}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0E1A' } }} />
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0E1A' }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text style={{ color: '#8BB4FF', fontSize: 22, fontWeight: '800' }}>起動エラー（捕捉済）</Text>
          <Text selectable style={{ color: '#FFD06B', fontSize: 15, fontWeight: '700' }}>
            {error?.name}: {error?.message}
          </Text>
          <Text selectable style={{ color: '#D9D2E6', fontSize: 12 }}>{error?.stack}</Text>
          <Text onPress={() => retry()} style={{ color: '#7EC98F', fontSize: 16, marginTop: 16 }}>↻ もう一度</Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
