import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line } from 'react-native-svg';

// 夜の風景背景 v4 — 生成アート（ChatGPT gpt-image-2）をベースに、コードは
// 「動き・輝き・奥行き」だけを重ねるハイブリッド。
//  - landscape … 録音画面用フルシーン（満月 + 夜雲 + 山並み + 残光）
//  - ambient   … 他画面用の控えめな空（UI が主役）
// v4 変更: react-native の Image は実機で背景が描画されないことがあったため、
// expo-image（contentFit）へ切替。scrim=true で下方を締めるグラデ（奥行き + 可読性）。
const SRC = {
  landscape: require('../assets/images/bg-night-landscape.jpg'),
  ambient: require('../assets/images/bg-night-ambient.jpg'),
} as const;

// 写真の上に足す「くっきりした星」(x,y は 0-1 比率)。
const STARS: { x: number; y: number; r: number; o: number }[] = [
  { x: 0.1, y: 0.07, r: 1.1, o: 0.6 },
  { x: 0.3, y: 0.12, r: 0.8, o: 0.35 },
  { x: 0.55, y: 0.05, r: 0.9, o: 0.45 },
  { x: 0.16, y: 0.2, r: 0.7, o: 0.3 },
  { x: 0.44, y: 0.16, r: 0.7, o: 0.28 },
  { x: 0.07, y: 0.33, r: 0.7, o: 0.2 },
  { x: 0.9, y: 0.3, r: 0.8, o: 0.25 },
  { x: 0.68, y: 0.26, r: 0.6, o: 0.2 },
];

const SPARKLES: { x: number; y: number; a: number; o: number }[] = [
  { x: 0.22, y: 0.1, a: 6, o: 0.8 },
  { x: 0.78, y: 0.2, a: 4.5, o: 0.5 },
  { x: 0.4, y: 0.26, a: 3.5, o: 0.35 },
];

export function NightBackground({
  width,
  height,
  variant = 'ambient',
  scrim = false,
}: {
  width: number;
  height: number;
  variant?: 'landscape' | 'ambient';
  scrim?: boolean;
}) {
  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Image
        source={SRC[variant]}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
      {scrim && (
        <LinearGradient
          colors={['rgba(4,6,15,0.18)', 'rgba(4,6,15,0.04)', 'rgba(4,6,15,0.5)', 'rgba(4,6,15,0.94)']}
          locations={[0, 0.32, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {STARS.map((st, i) => (
          <Circle key={`s${i}`} cx={st.x * width} cy={st.y * height} r={st.r} fill="#FFFFFF" opacity={st.o} />
        ))}
        {SPARKLES.map((sp, i) => (
          <G key={`sp${i}`} opacity={sp.o}>
            <Line
              x1={sp.x * width}
              y1={sp.y * height - sp.a}
              x2={sp.x * width}
              y2={sp.y * height + sp.a}
              stroke="#DCE6FF"
              strokeWidth={1}
              strokeLinecap="round"
            />
            <Line
              x1={sp.x * width - sp.a}
              y1={sp.y * height}
              x2={sp.x * width + sp.a}
              y2={sp.y * height}
              stroke="#DCE6FF"
              strokeWidth={1}
              strokeLinecap="round"
            />
          </G>
        ))}
      </Svg>
    </View>
  );
}
