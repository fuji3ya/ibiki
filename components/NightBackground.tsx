import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Circle } from 'react-native-svg';

// 夜空の背景：縦グラデ + 上部/右上のオーロラ微光 + 星。
// design-reference-first（Sleep Cycle/SnoreLab 北極星）で承認した HTML の RN 移植。
// フラットな単色背景を置き換え、奥行きと大気感を出す。
const STARS = [
  { x: 0.14, y: 0.09, o: 0.5 },
  { x: 0.3, y: 0.15, o: 0.32 },
  { x: 0.68, y: 0.07, o: 0.5 },
  { x: 0.84, y: 0.13, o: 0.4 },
  { x: 0.5, y: 0.05, o: 0.3 },
  { x: 0.78, y: 0.2, o: 0.3 },
  { x: 0.2, y: 0.23, o: 0.25 },
  { x: 0.9, y: 0.28, o: 0.22 },
];

export function NightBackground({ width, height }: { width: number; height: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#070A14" />
            <Stop offset="0.46" stopColor="#0C1226" />
            <Stop offset="1" stopColor="#0A0F1F" />
          </LinearGradient>
          <RadialGradient id="aur1" cx="50%" cy="0%" r="62%">
            <Stop offset="0" stopColor="#7C6CD2" stopOpacity="0.30" />
            <Stop offset="1" stopColor="#7C6CD2" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="aur2" cx="84%" cy="9%" r="55%">
            <Stop offset="0" stopColor="#5E7CC4" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#5E7CC4" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#bg)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#aur1)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#aur2)" />
        {STARS.map((s, i) => (
          <Circle key={i} cx={s.x * width} cy={s.y * height} r={1.4} fill="#FFFFFF" opacity={s.o} />
        ))}
      </Svg>
    </View>
  );
}
