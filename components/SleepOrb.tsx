import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { SymbolView } from 'expo-symbols';
import { theme } from '../lib/theme';

// 就寝ボタン v2「呼吸するガラス球」（承認 HTML home-v2 の RN 移植）。
// 旧実装の「四角い艶」の正体は、円の中に角丸"長方形"のハイライトを置いていたこと。
// v2 は全て円/放射で構成: 放射グラデで球の陰影 + 丸い鏡面ハイライト + リム +
// 同心リング + 外周グロー(shadow)。中身(月アイコン+文言)は絶対配置で重ねる。
const STACK = 230;
const ORB = 168;
const C = ORB / 2;

export function SleepOrb({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.stack}>
      {/* 同心の呼吸ハロー（淡い輪） */}
      <View style={[styles.ring, styles.ring1]} pointerEvents="none" />
      <View style={[styles.ring, styles.ring2]} pointerEvents="none" />
      <Pressable onPress={onPress} style={({ pressed }) => [styles.orb, pressed && styles.pressed]}>
        {/* 球の陰影 + 鏡面ハイライト + リム（全て円/放射） */}
        <Svg width={ORB} height={ORB} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="sphere" cx="36%" cy="28%" r="78%">
              <Stop offset="0" stopColor="#BED0FF" stopOpacity={0.30} />
              <Stop offset="0.4" stopColor="#7890CD" stopOpacity={0.12} />
              <Stop offset="0.75" stopColor="#1A2242" stopOpacity={0.62} />
              <Stop offset="1" stopColor="#0A0F24" stopOpacity={0.82} />
            </RadialGradient>
            <RadialGradient id="spec" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={C - 1} fill="url(#sphere)" />
          <Ellipse cx={C * 0.72} cy={C * 0.54} rx={30} ry={17} fill="url(#spec)" />
          <Circle cx={C} cy={C} r={C - 1} fill="none" stroke="rgba(190,208,255,0.34)" strokeWidth={1} />
        </Svg>
        <View style={styles.content} pointerEvents="none">
          <SymbolView name="moon.stars.fill" size={32} tintColor="#CDDCFF" fallback={<Text style={{ fontSize: 28 }}>●</Text>} />
          <Text style={styles.label}>おやすみ</Text>
          <Text style={styles.sub}>録音をはじめる</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: STACK, height: STACK, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: STACK, borderWidth: 1 },
  ring1: { width: 212, height: 212, borderColor: 'rgba(176,196,255,0.14)' },
  ring2: { width: 186, height: 186, borderColor: 'rgba(176,196,255,0.10)' },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: C,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // 外周グロー（円に沿う）
    shadowColor: '#7C8CF0',
    shadowOpacity: 0.5,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  pressed: { opacity: 0.82 },
  content: { position: 'absolute', alignItems: 'center', gap: 7 },
  label: { color: '#fff', fontSize: 25, fontWeight: '700', letterSpacing: 2 },
  sub: { color: theme.accent, fontSize: 11.5, letterSpacing: 2 },
});
