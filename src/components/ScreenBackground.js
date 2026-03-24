import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');

/**
 * Eight-pointed star (Rub el-Hizb / Islamic star) as SVG path.
 * cx, cy = center;  r = outer radius
 */
function Star8({ cx, cy, r, stroke, strokeWidth = 0.5, opacity = 0.12 }) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const outerR = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${cx + Math.cos(angle) * outerR},${cy + Math.sin(angle) * outerR}`);
  }
  return (
    <Path
      d={`M${pts[0]} L${pts[1]} L${pts[2]} L${pts[3]} L${pts[4]} L${pts[5]} L${pts[6]} L${pts[7]} Z`}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      opacity={opacity}
    />
  );
}

/**
 * Full-screen dark Islamic-patterned gradient background.
 * Uses SVG geometric motifs inspired by Islamic art: eight-pointed stars,
 * interlocking circles, and lattice lines.
 */
export function ScreenBackground({ children }) {
  useTheme();
  const styles = createStyles();
  return (
    <LinearGradient
      colors={[colors.backgroundTop, '#072b24', colors.backgroundBottom]}
      locations={[0, 0.35, 1]}
      style={styles.background}
    >
      {/* Islamic geometric motif layer */}
      <View style={styles.patternLayer} pointerEvents="none">
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          {/* ── Diagonal lattice grid ── */}
          {Array.from({ length: 14 }).map((_, i) => (
            <G key={`lat-${i}`}>
              <Line
                x1={0} y1={i * 72} x2={W} y2={i * 72 + W * 0.45}
                stroke="rgba(200, 161, 90, 0.04)"
                strokeWidth={0.5}
              />
              <Line
                x1={W} y1={i * 72} x2={0} y2={i * 72 + W * 0.45}
                stroke="rgba(200, 161, 90, 0.04)"
                strokeWidth={0.5}
              />
            </G>
          ))}

          {/* ── Interlocking circles (Islamic rosette pattern) ── */}
          {[
            { cx: W * 0.15, cy: H * 0.08, r: 32 },
            { cx: W * 0.85, cy: H * 0.14, r: 28 },
            { cx: W * 0.5,  cy: H * 0.28, r: 36 },
            { cx: W * 0.08, cy: H * 0.42, r: 24 },
            { cx: W * 0.92, cy: H * 0.48, r: 30 },
            { cx: W * 0.3,  cy: H * 0.58, r: 26 },
            { cx: W * 0.7,  cy: H * 0.65, r: 34 },
            { cx: W * 0.5,  cy: H * 0.78, r: 28 },
            { cx: W * 0.15, cy: H * 0.88, r: 22 },
            { cx: W * 0.85, cy: H * 0.92, r: 26 },
          ].map((c, i) => (
            <G key={`rosette-${i}`}>
              {/* Outer ring */}
              <Circle
                cx={c.cx} cy={c.cy} r={c.r}
                stroke="rgba(200, 161, 90, 0.07)"
                strokeWidth={0.7}
                fill="none"
              />
              {/* Inner ring */}
              <Circle
                cx={c.cx} cy={c.cy} r={c.r * 0.55}
                stroke="rgba(130, 171, 137, 0.06)"
                strokeWidth={0.5}
                fill="none"
              />
              {/* Eight-pointed star inside */}
              <Star8
                cx={c.cx} cy={c.cy} r={c.r * 0.8}
                stroke="rgba(200, 161, 90, 0.09)"
                strokeWidth={0.6}
                opacity={1}
              />
            </G>
          ))}

          {/* ── Small decorative diamonds in grid ── */}
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 4 }).map((_, col) => {
              const x = col * (W / 3.5) + (row % 2 === 0 ? 20 : W / 7);
              const y = row * (H / 4.5) + 50;
              return (
                <Rect
                  key={`d-${row}-${col}`}
                  x={x - 3} y={y - 3}
                  width={6} height={6}
                  transform={`rotate(45, ${x}, ${y})`}
                  stroke="rgba(200, 161, 90, 0.06)"
                  strokeWidth={0.5}
                  fill="none"
                />
              );
            })
          )}
        </Svg>
      </View>
      {children}
    </LinearGradient>
  );
}

const createStyles = () => ({
  background: {
    flex: 1,
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
