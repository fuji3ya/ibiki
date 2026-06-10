import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';

// 夜の風景背景 v3 — 生成アート（ChatGPT gpt-image-2, 2026-06-10 ふじ指示で
// SVG 手描きから写真級レンダリングへ切替）をベースに、コードは「動き・輝き」
// だけを重ねるハイブリッド。
//  - landscape … 録音画面用フルシーン（満月 + 夜雲 + 山並み + 残光）
//  - ambient   … 他画面用の控えめな空（月明かりの滲みのみ・UI が主役）
// 元画像: assets/images/bg-night-{landscape,ambient}.jpg（1080x1620 JPEG）
const SRC = {
  landscape: require('../assets/images/bg-night-landscape.jpg'),
  ambient: require('../assets/images/bg-night-ambient.jpg'),
} as const;

// 写真の上に足す「くっきりした星」(x,y は 0-1 比率)。写真側の星は淡いので、
// 数個の輝点と十字のきらめきで夜空に生気を足す。
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
}: {
  width: number;
  height: number;
  variant?: 'landscape' | 'ambient';
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={SRC[variant]} style={StyleSheet.absoluteFill} resizeMode="cover" />
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

