import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
        const color = active ? theme.accent : theme.textFaint;
        return (
          // asChild で flex を実 View(Pressable) に効かせる。Link 直接に flex:1 を
          // 当てると実機でタブが等間隔にならず左寄りになるバグの修正。
          <Link key={it.href} href={it.href} asChild>
            <Pressable style={styles.item}>
              <SymbolView
                name={it.icon}
                size={22}
                tintColor={color}
                fallback={<Text style={{ color }}>●</Text>}
              />
              <Text style={[styles.label, { color }]}>{it.label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingBottom: 22,
    paddingHorizontal: 8,
  },
  hairline: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1 },
});
