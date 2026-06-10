import { Link, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { theme } from '../lib/theme';

type Item = { href: '/' | '/streak' | '/trends' | '/settings'; label: string; icon: SymbolViewProps['name'] };

const ITEMS: Item[] = [
  { href: '/', label: '録音', icon: 'moon.stars.fill' },
  { href: '/streak', label: '記録', icon: 'flame.fill' },
  { href: '/trends', label: 'トレンド', icon: 'chart.xyaxis.line' },
  { href: '/settings', label: '設定', icon: 'gearshape.fill' },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <View style={styles.bar}>
      <LinearGradient
        colors={['transparent', 'rgba(176,196,255,0.18)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.hairline}
      />
      {ITEMS.map((it) => {
        const active = path === it.href;
        return (
          <Link key={it.href} href={it.href} style={styles.item}>
            <View style={styles.itemInner}>
              <SymbolView
                name={it.icon}
                size={22}
                tintColor={active ? theme.accent : theme.textFaint}
                fallback={<Text style={{ color: active ? theme.accent : theme.textFaint }}>●</Text>}
              />
              <Text style={[styles.label, { color: active ? theme.accent : theme.textFaint }]}>{it.label}</Text>
            </View>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 22,
  },
  hairline: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  item: { flex: 1 },
  itemInner: { alignItems: 'center', gap: 4 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1 },
});
