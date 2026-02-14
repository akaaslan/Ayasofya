import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

/* ── Ring dimensions ────────────────────────────── */
const CONTAINER    = 300;          // overall canvas
const OUTER_SUBTLE = 282;          // faint outer ring (ticks sit on this)
const GOLD_RING    = 262;          // main golden border
const INNER_RING   = 228;          // subtle inner border
const TICK_COUNT   = 60;
const TICK_R       = OUTER_SUBTLE / 2;   // 141
const C            = CONTAINER / 2;      // center = 150

/* Pre-compute tick-dot positions (calculated once, never re-renders) */
const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const a = (i * 2 * Math.PI) / TICK_COUNT - Math.PI / 2;
  return {
    left: C + Math.cos(a) * TICK_R - 1,
    top:  C + Math.sin(a) * TICK_R - 1,
  };
});

/**
 * Countdown ring matching the Ayasofya design:
 * - decorative tick dots on a faint outer ring
 * - golden main ring
 * - 4-pointed star ornament
 * - current prayer name (serif), golden countdown, dynamic caption
 */
export function CountdownRing({ label, prayerName, countdown, caption }) {
  return (
    <View style={styles.center}>
      <View style={styles.container}>
        {/* Decorative tick dots */}
        {TICKS.map((pos, i) => (
          <View key={i} style={[styles.tick, { left: pos.left, top: pos.top }]} />
        ))}

        {/* Three concentric rings */}
        <View style={styles.outerSubtle}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  container: {
    width: CONTAINER,
    height: CONTAINER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tick dots */
  tick: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: colors.accent,
    opacity: 0.4,
  },

  /* Outermost faint ring – ticks sit on its circumference */
  outerSubtle: {
    width: OUTER_SUBTLE,
    height: OUTER_SUBTLE,
    borderRadius: OUTER_SUBTLE / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 161, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 42,
    fontWeight: '300',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 2,
  },

  /* Countdown timer — golden */
  countdown: {
    color: colors.accent,
    fontSize: 28,
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
