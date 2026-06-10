import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// 夜の風景背景 v2（承認 HTML: ibiki-screens-v2.html の RN 移植）。
// 単色の紺ではなく「夜空そのもの」を描く: 天頂→地平線の色温度グラデ + 残光、
// 密度勾配の星空 + 十字のきらめき、クレーター付きの月 + 多層ブルーム + 月暈、
// 流れる雲、遠景の山並み（2層）。
// variant:
//  - 'landscape' … 録音画面用フルシーン（月 + 山並み）
//  - 'ambient'   … 他画面用の控えめな空（薄い月光 + 星 + 雲のみ）
const STARS = [
  { x: 36, y: 74, r: 1.1, o: 0.55 },
  { x: 92, y: 132, r: 0.8, o: 0.3 },
  { x: 146, y: 58, r: 0.9, o: 0.4 },
  { x: 206, y: 104, r: 0.7, o: 0.28 },
  { x: 258, y: 64, r: 1.2, o: 0.5 },
  { x: 318, y: 118, r: 0.8, o: 0.33 },
  { x: 356, y: 70, r: 1.0, o: 0.45 },
  { x: 64, y: 188, r: 0.7, o: 0.25 },
  { x: 282, y: 170, r: 0.9, o: 0.3 },
  { x: 338, y: 208, r: 0.7, o: 0.22 },
  { x: 120, y: 236, r: 0.8, o: 0.22 },
  { x: 30, y: 300, r: 0.7, o: 0.18 },
  { x: 352, y: 296, r: 0.8, o: 0.18 },
  { x: 196, y: 262, r: 0.6, o: 0.15 },
  { x: 80, y: 380, r: 0.7, o: 0.13 },
  { x: 312, y: 392, r: 0.7, o: 0.12 },
];

// 十字にきらめく星 [cx, cy, 腕の長さ, opacity]
const SPARKLES: [number, number, number, number][] = [
  [86, 92, 6, 0.8],
  [300, 146.5, 4.5, 0.5],
  [180, 199.5, 3.5, 0.35],
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
  // 承認 HTML は 390x844 基準。シーン要素は横幅でスケール。
  const s = width / 390;
  const isLandscape = variant === 'landscape';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#04060F" />
            <Stop offset="0.22" stopColor="#060A1C" />
            <Stop offset="0.46" stopColor="#0A1130" />
            <Stop offset="0.64" stopColor="#101740" />
            <Stop offset="0.78" stopColor="#1A1F52" />
            <Stop offset="0.9" stopColor="#2B2560" />
            <Stop offset="1" stopColor="#3A2B60" />
          </LinearGradient>
          <RadialGradient id="afterglow" cx="50%" cy="108%" r="62%">
            <Stop offset="0" stopColor="#7A52A0" stopOpacity={0.34} />
            <Stop offset="1" stopColor="#7A52A0" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="afterglow2" cx="18%" cy="96%" r="50%">
            <Stop offset="0" stopColor="#404696" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#404696" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#C7D7FF" stopOpacity={0.3} />
            <Stop offset="0.35" stopColor="#A8BEF5" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#A8BEF5" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="moonBody" cx="38%" cy="32%" r="80%">
            <Stop offset="0" stopColor="#F4F7FF" />
            <Stop offset="0.55" stopColor="#DCE6FB" />
            <Stop offset="1" stopColor="#AEBEE8" />
          </RadialGradient>
          <LinearGradient id="cloud" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8C9BD8" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#8C9BD8" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#8C9BD8" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="m1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#10173B" />
            <Stop offset="1" stopColor="#0B1029" />
          </LinearGradient>
          <LinearGradient id="m2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#191F4D" />
            <Stop offset="1" stopColor="#101539" />
          </LinearGradient>
        </Defs>

        {/* 空（グラデ + 地平線の残光） */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#sky)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#afterglow)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#afterglow2)" />

        {/* 星空（密度勾配） */}
        {STARS.map((st, i) => (
          <Circle key={`s${i}`} cx={st.x * s} cy={st.y * s} r={st.r * s} fill="#FFFFFF" opacity={st.o} />
        ))}
        {SPARKLES.map(([cx, cy, a, o], i) => (
          <G key={`sp${i}`} opacity={o}>
            <Line x1={cx * s} y1={(cy - a) * s} x2={cx * s} y2={(cy + a) * s} stroke="#DCE6FF" strokeWidth={1} strokeLinecap="round" />
            <Line x1={(cx - a) * s} y1={cy * s} x2={(cx + a) * s} y2={cy * s} stroke="#DCE6FF" strokeWidth={1} strokeLinecap="round" />
          </G>
        ))}

        {isLandscape ? (
          <>
            {/* 月（多層ブルーム + 本体 + クレーター + 月暈） */}
            <Circle cx={282 * s} cy={178 * s} r={118 * s} fill="url(#moonGlow)" />
            <Circle cx={282 * s} cy={178 * s} r={64 * s} fill="url(#moonGlow)" />
            <Circle cx={282 * s} cy={178 * s} r={34 * s} fill="url(#moonBody)" />
            <Circle cx={270 * s} cy={168 * s} r={6 * s} fill="#9FB2DF" opacity={0.5} />
            <Circle cx={292 * s} cy={188 * s} r={4.4 * s} fill="#9FB2DF" opacity={0.5} />
            <Circle cx={284 * s} cy={164 * s} r={2.6 * s} fill="#9FB2DF" opacity={0.5} />
            <Circle cx={271 * s} cy={190 * s} r={3 * s} fill="#9FB2DF" opacity={0.5} />
            <Circle cx={296 * s} cy={172 * s} r={2 * s} fill="#8DA2D4" opacity={0.3} />
            <Circle cx={262 * s} cy={180 * s} r={1.8 * s} fill="#8DA2D4" opacity={0.3} />
            <Circle cx={282 * s} cy={178 * s} r={50 * s} fill="none" stroke="#C7D7FF" strokeOpacity={0.14} strokeWidth={1} />

            {/* 流れる雲 */}
            <Ellipse cx={240 * s} cy={196 * s} rx={120 * s} ry={11 * s} fill="url(#cloud)" />
            <Ellipse cx={320 * s} cy={152 * s} rx={90 * s} ry={8 * s} fill="url(#cloud)" opacity={0.7} />
            <Ellipse cx={120 * s} cy={290 * s} rx={130 * s} ry={10 * s} fill="url(#cloud)" opacity={0.5} />

            {/* 遠景の山並み（2層・画面下端にアンカー） */}
            <Path
              d={mountainPath(width, height, s, [
                [0, 704], [46, 668], [92, 694], [138, 650], [196, 690], [248, 656], [306, 696], [352, 668], [390, 688],
              ])}
              fill="url(#m2)"
            />
            <Path
              d={mountainPath(width, height, s, [
                [0, 742], [58, 712], [108, 736], [172, 700], [232, 738], [300, 708], [356, 734], [390, 718],
              ])}
              fill="url(#m1)"
            />
          </>
        ) : (
          <>
            {/* ambient: 控えめな月光 + 雲のみ */}
            <Circle cx={330 * s} cy={92 * s} r={70 * s} fill="url(#moonGlow)" opacity={0.6} />
            <Ellipse cx={240 * s} cy={110 * s} rx={110 * s} ry={8 * s} fill="url(#cloud)" opacity={0.7} />
          </>
        )}
      </Svg>
    </View>
  );
}

// 山並みの折れ線を画面下端まで閉じたパスにする。844 基準の y をシーンスケールに
// 乗せつつ、最下辺は実画面の height にアンカー（縦長端末で山が浮かない）。
function mountainPath(width: number, height: number, s: number, pts: [number, number][]): string {
  const yOf = (y: number) => height - (844 - y) * s;
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x * s},${yOf(y)}`).join(' ');
  return `${line} L${width},${height} L0,${height} Z`;
}
