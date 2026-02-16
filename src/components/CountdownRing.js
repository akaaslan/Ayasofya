import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { colors } from '../theme/colors';

/* ── Ring dimensions ────────────────────────────── */
const CONTAINER    = 280;
const SVG_SIZE     = 270;                    // SVG canvas
const STROKE_W     = 5;                      // progress arc width (thicker)
const RADIUS       = (SVG_SIZE - STROKE_W * 2) / 2;  // 132
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GOLD_RING    = 242;
const INNER_RING   = 210;

/* Tick dots on outermost edge */
const TICK_COUNT   = 60;
const TICK_R       = SVG_SIZE / 2;
const C            = CONTAINER / 2;

const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const a = (i * 2 * Math.PI) / TICK_COUNT - Math.PI / 2;
  return {
    left: C + Math.cos(a) * TICK_R - 1,
    top:  C + Math.sin(a) * TICK_R - 1,
  };
});

/**
 * Countdown ring with SVG progress arc.
 * Props:
 *   label        – e.g. "VAKİT İÇİNDE"
 *   prayerName   – current prayer name
 *   countdown    – HH:MM:SS string
 *   caption      – e.g. "İKİNDİYE KALAN"
 *   progress     – 0‒1 fraction (fills clockwise)
 */
export function CountdownRing({ label, prayerName, countdown, caption, progress = 0 }) {
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.center}>
      <View style={styles.container}>
        {/* Decorative tick dots */}
        {TICKS.map((pos, i) => (
          <View key={i} style={[styles.tick, { left: pos.left, top: pos.top }]} />
        ))}

        {/* SVG progress arc (behind the rings) */}
        <View style={styles.svgWrap}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            <Defs>
              <SvgGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity="1" />
                <Stop offset="1" stopColor={colors.accentGlow} stopOpacity="0.7" />
              </SvgGradient>
            </Defs>
            {/* Track */}
            <Circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={RADIUS}
              stroke="rgba(200, 161, 90, 0.15)"
              strokeWidth={STROKE_W}
              fill="none"
            />
            {/* Glow layer (wider, translucent) */}
            <Circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={RADIUS}
              stroke={colors.accentGlow}
              strokeWidth={STROKE_W + 6}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${SVG_SIZE / 2}, ${SVG_SIZE / 2}`}
              opacity={0.15}
            />
            {/* Progress */}
            <Circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={RADIUS}
              stroke="url(#arcGrad)"
              strokeWidth={STROKE_W}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${SVG_SIZE / 2}, ${SVG_SIZE / 2}`}
            />
          </Svg>
        </View>

        {/* Concentric rings + content */}
        <View style={styles.goldRing}>
          <View style={styles.innerRing}>
            <Text style={styles.star}>✦</Text>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.prayer} numberOfLines={1} adjustsFontSizeToFit>
              {prayerName}
            </Text>
            <Text style={styles.countdown}>{countdown}</Text>
            <Text style={styles.caption}>{caption}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  container: {
    width: CONTAINER,
    height: CONTAINER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* SVG sits absolutely behind the rings */
  svgWrap: {
    position: 'absolute',
    left: (CONTAINER - SVG_SIZE) / 2,
    top: (CONTAINER - SVG_SIZE) / 2,
  },

  /* Tick dots */
  tick: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: colors.accent,
    opacity: 0.35,
  },

  /* Main golden ring */
  goldRing: {
    width: GOLD_RING,
    height: GOLD_RING,
    borderRadius: GOLD_RING / 2,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 24, 20, 0.45)',
  },

  /* Subtle inner circle */
  innerRing: {
    width: INNER_RING,
    height: INNER_RING,
    borderRadius: INNER_RING / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 161, 90, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  /* 4-pointed star ornament */
  star: {
    color: colors.accent,
    fontSize: 14,
    marginBottom: 2,
  },

  /* "VAKİT İÇİNDE" */
  label: {
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  /* Prayer name — serif font */
  prayer: {
    color: colors.textPrimary,
    fontSize: 38,
    fontWeight: '300',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 2,
  },

  /* Countdown timer — golden */
  countdown: {
    color: colors.accent,
    fontSize: 26,
    letterSpacing: 2,
    fontWeight: '300',
    marginBottom: 6,
    fontVariant: ['tabular-nums'],
  },

  /* "İKİNDİYE KALAN" etc. */
  caption: {
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
