import { Link, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { theme } from '../lib/theme';

type Item = { href: '/' | '/streak' | '/settings'; label: string; icon: SymbolViewProps['name'] };

const ITEMS: Item[] = [
  { href: '/', label: '録音', icon: 'moon.stars.fill' },
  { href: '/streak', label: '記録', icon: 'flame.fill' },
  { href: '/settings', label: '設定', icon: 'gearshape.fill' },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <View style={styles.bar}>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bg,
    paddingTop: 8,
    paddingBottom: 24,
  },
  item: { flex: 1 },
  itemInner: { alignItems: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '700' },
});
