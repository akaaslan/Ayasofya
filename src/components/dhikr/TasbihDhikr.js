import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import { colors } from '../../theme/colors';
import { getDhikrTotal, saveDhikrSession, getDhikrData, incrementDhikrCount, resetDhikr } from '../../utils/dhikrStorage';
import { getHapticEnabled, getTapSoundEnabled } from '../../utils/preferences';
import { playTapSound } from '../../utils/tapSound';

const AnimatedG = Animated.createAnimatedComponent(G);

const { width: W, height: H } = Dimensions.get('window');

/* ── Bead chain constants ── */
const BEAD_R  = Math.min(W * 0.09, 24);
const BEAD_D  = BEAD_R * 2;                              // diameter — beads touch
const CHAIN_W = W * 0.5;
const CX      = CHAIN_W / 2;
const ROPE_W  = 4;

const TOP_Y        = BEAD_R + 6;                          // top bead centre
const GAP          = BEAD_R * 1.2;                        // space between top & bottom group
const BOTTOM_START = TOP_Y + BEAD_D + GAP;                // first bottom bead centre
const CHAIN_H      = BOTTOM_START + 4 * BEAD_D + BEAD_R;      // SVG height — flush with last bead
const SLIDE_DIST   = BOTTOM_START - TOP_Y;                // top → first-bottom travel

/* ── Hyper-realistic bead (memoized — constant props, never needs re-render) ── */
const Bead = memo(function Bead({ cx, cy }) {
  const r = BEAD_R;
  return (
    <G>
      {/* Drop shadow */}
      <Ellipse cx={cx + 1} cy={cy + r * 0.88} rx={r * 0.65} ry={r * 0.16}
        fill="rgba(0,0,0,0.2)" />

      {/* Ambient occlusion ring */}
      <Circle cx={cx} cy={cy} r={r + 0.8}
        fill="rgba(50,25,5,0.15)" />

      {/* Main bead body */}
      <Circle cx={cx} cy={cy} r={r}
        fill="url(#beadBody)" />

      {/* Subsurface warm glow at edges */}
      <Circle cx={cx} cy={cy} r={r}
        fill="url(#beadGlow)" />

      {/* Wood grain streak 1 */}
      <Path d={`M${cx - r * 0.7},${cy - r * 0.05} Q${cx},${cy - r * 0.35} ${cx + r * 0.65},${cy - r * 0.1}`}
        stroke="rgba(165,105,32,0.14)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* Wood grain streak 2 */}
      <Path d={`M${cx - r * 0.55},${cy + r * 0.22} Q${cx + r * 0.15},${cy + r * 0.06} ${cx + r * 0.7},${cy + r * 0.28}`}
        stroke="rgba(148,90,25,0.11)" strokeWidth={1} fill="none" strokeLinecap="round" />
      {/* Wood grain streak 3 */}
      <Path d={`M${cx - r * 0.4},${cy + r * 0.48} Q${cx},${cy + r * 0.34} ${cx + r * 0.5},${cy + r * 0.46}`}
        stroke="rgba(135,80,22,0.08)" strokeWidth={0.8} fill="none" strokeLinecap="round" />

      {/* Inner depth ring */}
      <Circle cx={cx} cy={cy} r={r * 0.88}
        fill="none" stroke="rgba(70,40,12,0.1)" strokeWidth={2} />

      {/* Main specular highlight */}
      <Ellipse cx={cx - r * 0.22} cy={cy - r * 0.28} rx={r * 0.36} ry={r * 0.22}
        fill="rgba(255,248,220,0.32)" />

      {/* Sharp specular point */}
      <Ellipse cx={cx - r * 0.18} cy={cy - r * 0.36} rx={r * 0.13} ry={r * 0.07}
        fill="rgba(255,255,250,0.55)" />

      {/* Bottom-right rim light */}
      <Path d={`M${cx + r * 0.5},${cy + r * 0.72} A${r * 0.92},${r * 0.92} 0 0,0 ${cx + r * 0.88},${cy + r * 0.18}`}
        stroke="rgba(255,218,145,0.12)" strokeWidth={1.2} fill="none" strokeLinecap="round" />

      {/* String hole — top */}
      <Circle cx={cx} cy={cy - r + 2.5} r={ROPE_W * 0.5}
        fill="rgba(25,12,5,0.5)" />
      <Circle cx={cx - 0.4} cy={cy - r + 2} r={ROPE_W * 0.22}
        fill="rgba(90,55,20,0.25)" />

      {/* String hole — bottom */}
      <Circle cx={cx} cy={cy + r - 2.5} r={ROPE_W * 0.5}
        fill="rgba(25,12,5,0.4)" />

      {/* Edge definition */}
      <Circle cx={cx} cy={cy} r={r}
        fill="none" stroke="rgba(100,65,20,0.22)" strokeWidth={0.6} />
    </G>
  );
});

/* ── Animated 6-bead chain SVG — full physics system (memoized) ── */
const TasbihChainSvg = memo(function TasbihChainSvg({ progress, impactWave, swingPhase }) {
  const ropeTop = 0;
  const ropeBot = CHAIN_H;
  const LIFT = 4;
  const H33 = CHAIN_H * 0.33;
  const H66 = CHAIN_H * 0.66;

  /* Bottom 5 bead y-positions (touching) */
  const bottomYs = [];
  for (let i = 0; i < 5; i++) bottomYs.push(BOTTOM_START + i * BEAD_D);

  /* ── Active bead: anticipation lift → gravity drop → overshoot → 2-bounce settle ── */
  const slideDown = progress.interpolate({
    inputRange:  [0,    0.05,  0.10,  0.48,  0.64,  0.75,  0.85,  0.93,  1],
    outputRange: [0,    -LIFT, -LIFT * 0.4, SLIDE_DIST * 0.93, SLIDE_DIST * 1.06, SLIDE_DIST * 0.97, SLIDE_DIST * 1.015, SLIDE_DIST * 0.998, SLIDE_DIST],
  });

  /* ── New bead from above: delayed entry, gravity pull, micro-bounce ── */
  const slideIn = progress.interpolate({
    inputRange:  [0,    0.32,  0.52,  0.74,  0.86,  0.94,  1],
    outputRange: [-SLIDE_DIST, -SLIDE_DIST, -SLIDE_DIST * 0.35, -SLIDE_DIST * 0.025, SLIDE_DIST * 0.012, -SLIDE_DIST * 0.004, 0],
  });

  /* (Bottom bead exit is now handled by pushDown — no separate slideOut needed) */

  /* ── Cascading impact ripple through bottom beads (domino shock absorption) ── */
  const impactBounce0 = impactWave.interpolate({
    inputRange:  [0, 0.10, 0.25, 0.42, 0.62, 0.82, 1],
    outputRange: [0, -3.5, 1.4,  -0.7, 0.25, -0.08, 0],
  });
  const impactBounce1 = impactWave.interpolate({
    inputRange:  [0, 0.15, 0.32, 0.50, 0.70, 0.88, 1],
    outputRange: [0, 0,    -2.6, 1.0,  -0.35, 0.1, 0],
  });
  const impactBounce2 = impactWave.interpolate({
    inputRange:  [0, 0.25, 0.42, 0.60, 0.80, 1],
    outputRange: [0, 0,    0,    -1.7, 0.5,  0],
  });
  const impactBounce3 = impactWave.interpolate({
    inputRange:  [0, 0.35, 0.55, 0.72, 0.90, 1],
    outputRange: [0, 0,    0,    0,    -1.0, 0],
  });

  /* ── Push-down: active bead pushes entire bottom group down by 1 bead diameter ── */
  /* Each bead starts moving slightly later than the one above (cascading push) */
  const pushDown0 = progress.interpolate({
    inputRange:  [0, 0.44, 0.55, 0.72, 0.88, 1],
    outputRange: [0, 0,    BEAD_D * 0.7, BEAD_D * 0.95, BEAD_D, BEAD_D],
  });
  const pushDown1 = progress.interpolate({
    inputRange:  [0, 0.48, 0.60, 0.76, 0.90, 1],
    outputRange: [0, 0,    BEAD_D * 0.55, BEAD_D * 0.9, BEAD_D, BEAD_D],
  });
  const pushDown2 = progress.interpolate({
    inputRange:  [0, 0.52, 0.65, 0.80, 0.92, 1],
    outputRange: [0, 0,    BEAD_D * 0.4, BEAD_D * 0.85, BEAD_D, BEAD_D],
  });
  const pushDown3 = progress.interpolate({
    inputRange:  [0, 0.56, 0.70, 0.84, 0.94, 1],
    outputRange: [0, 0,    BEAD_D * 0.25, BEAD_D * 0.8, BEAD_D, BEAD_D],
  });
  /* Bottom bead 5: pushed down same as bead 4 + exits out of view */
  const pushDown4 = progress.interpolate({
    inputRange:  [0, 0.56, 0.70, 0.84, 0.94, 1],
    outputRange: [0, 0,    BEAD_D * 0.25, BEAD_D * 0.8, BEAD_D, BEAD_D],
  });

  /* Combine push + ripple for beads 1–4 */
  const bottomOffsets = [
    Animated.add(pushDown0, impactBounce0),
    Animated.add(pushDown1, impactBounce1),
    Animated.add(pushDown2, impactBounce2),
    Animated.add(pushDown3, impactBounce3),
  ];
  /* Bead 5: push only (it exits the visible area) */
  const bottomExitOffset = pushDown4;

  /* ── Moving beads lateral sway (follows rope curve) ── */
  const beadSwayX = progress.interpolate({
    inputRange:  [0, 0.10, 0.25, 0.42, 0.58, 0.72, 0.86, 1],
    outputRange: [0, 2.5,  -1.8, 1.2,  -0.8, 0.5,  -0.2, 0],
  });

  /* ── Rope dampened pendulum — 4-cycle decay ── */
  const ropeSway = swingPhase.interpolate({
    inputRange:  [0, 0.08, 0.22, 0.36, 0.50, 0.64, 0.78, 0.90, 1],
    outputRange: [0, 7.5,  -5.5, 3.8,  -2.5, 1.5,  -0.8, 0.3,  0],
  });

  /* Static rope texture twists */
  const twists = [];
  for (let y = ropeTop; y < ropeBot; y += 10) {
    const a = 2;
    twists.push(
      `M${CX + a},${y} Q${CX + a * 2},${y + 5} ${CX - a},${y + 10}`,
      `M${CX - a},${y} Q${CX - a * 2},${y + 5} ${CX + a},${y + 10}`,
    );
  }

  /* Animated rope — cubic bezier with asymmetric pendulum sway (catenary-like) */
  const ropeD = ropeSway.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: [
      `M${CX},${ropeTop} C${CX - 14},${H33} ${CX - 9},${H66} ${CX},${ropeBot}`,
      `M${CX},${ropeTop} C${CX},${H33} ${CX},${H66} ${CX},${ropeBot}`,
      `M${CX},${ropeTop} C${CX + 14},${H33} ${CX + 9},${H66} ${CX},${ropeBot}`,
    ],
  });

  return (
    <Svg width={CHAIN_W} height={CHAIN_H} viewBox={`0 0 ${CHAIN_W} ${CHAIN_H}`}>
      <Defs>
        {/* Rich amber bead — 6-stop off-center radial for 3D depth */}
        <RadialGradient id="beadBody" cx="38%" cy="32%" r="65%" fx="33%" fy="28%">
          <Stop offset="0%" stopColor="#faeab0" />
          <Stop offset="12%" stopColor="#e8c860" />
          <Stop offset="30%" stopColor="#d4a840" />
          <Stop offset="55%" stopColor="#b88830" />
          <Stop offset="78%" stopColor="#8a6520" />
          <Stop offset="100%" stopColor="#5a3e12" />
        </RadialGradient>
        {/* Subsurface scattering sim */}
        <RadialGradient id="beadGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(255,200,80,0)" />
          <Stop offset="70%" stopColor="rgba(255,200,80,0)" />
          <Stop offset="88%" stopColor="rgba(200,140,50,0.06)" />
          <Stop offset="100%" stopColor="rgba(180,100,20,0.12)" />
        </RadialGradient>
        {/* Rope gradient */}
        <SvgLinearGradient id="rope" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#b89868" />
          <Stop offset="20%" stopColor="#a08050" />
          <Stop offset="50%" stopColor="#8a6838" />
          <Stop offset="80%" stopColor="#a08050" />
          <Stop offset="100%" stopColor="#706030" />
        </SvgLinearGradient>
      </Defs>

      {/* Rope shadow */}
      <AnimatedPath d={ropeD}
        fill="none" stroke="rgba(40,25,8,0.16)" strokeWidth={ROPE_W + 3} strokeLinecap="round" />
      {/* Rope highlight */}
      <AnimatedPath d={ropeD}
        fill="none" stroke="rgba(200,170,110,0.1)" strokeWidth={ROPE_W + 1} strokeLinecap="round" />
      {/* Rope body */}
      <AnimatedPath d={ropeD}
        fill="none" stroke="url(#rope)" strokeWidth={ROPE_W} strokeLinecap="round" />
      {/* Rope braid texture */}
      {twists.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke="rgba(140,105,55,0.12)" strokeWidth={0.8} />
      ))}

      {/* New bead entering from above — follows rope sway */}
      <AnimatedG translateY={slideIn} translateX={beadSwayX}>
        <Bead cx={CX} cy={TOP_Y} />
      </AnimatedG>

      {/* Active bead falling down — follows rope sway */}
      <AnimatedG translateY={slideDown} translateX={beadSwayX}>
        <Bead cx={CX} cy={TOP_Y} />
      </AnimatedG>

      {/* Bottom beads 1–4: pushed down + impact ripple */}
      {bottomYs.slice(0, 4).map((y, i) => (
        <AnimatedG key={`b${i}`} translateY={bottomOffsets[i]}>
          <Bead cx={CX} cy={y} />
        </AnimatedG>
      ))}

      {/* Bottom bead 5: pushed out by the chain */}
      <AnimatedG translateY={bottomExitOffset}>
        <Bead cx={CX} cy={bottomYs[4]} />
      </AnimatedG>
    </Svg>
  );
});

/* ── Main component ── */
export function TasbihDhikr({ selectedIdx, onSelectDhikr, currentTarget, currentDhikr, dhikrs, onTargetReached, targetVibrationEnabled, onTap, onReset, count, setCount }) {
  const { fontScale } = useTheme();
  const { t } = useI18n();
  const s = createStyles(fontScale);
  const [totalCount, setTotalCount] = useState(0);
  const [allTotals, setAllTotals] = useState({});
  const [tapSoundOn, setTapSoundOn] = useState(false);
  const [hapticOn, setHapticOn] = useState(true);

  /* Physics animation values */
  const progress = useRef(new Animated.Value(0)).current;     // master bead slide
  const impactWave = useRef(new Animated.Value(0)).current;   // cascading impact ripple
  const swingPhase = useRef(new Animated.Value(0)).current;   // rope pendulum oscillation
  const pulseAnim = useRef(new Animated.Value(1)).current;    // chain scale pulse
  const animating = useRef(false);
  const swipeCounted = useRef(false);
  const hapticOnRef = useRef(hapticOn);
  const impactTimer = useRef(null);
  const swingTimer = useRef(null);
  const hapticTimer = useRef(null);
  hapticOnRef.current = hapticOn;

  useFocusEffect(useCallback(() => {
    getTapSoundEnabled().then(setTapSoundOn);
    getHapticEnabled().then(setHapticOn);
  }, []));

  useEffect(() => {
    let active = true;
    getDhikrTotal(currentDhikr.id).then((v) => { if (active) setTotalCount(v); });
    getDhikrData().then((d) => { if (active) setAllTotals(d.totals); });
    return () => { active = false; };
  }, [currentDhikr.id]);

  /* ── Entrance animations ── */
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.85)).current;
  const fadeActions = useRef(new Animated.Value(0)).current;
  const slideActions = useRef(new Animated.Value(30)).current;
  const fadeSelector = useRef(new Animated.Value(0)).current;
  const slideSelector = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const ND = false; // Must stay JS-driven — shares node tree with SVG animations
    const a = Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: ND }),
        Animated.spring(scaleIn, { toValue: 1, friction: 8, tension: 40, useNativeDriver: ND }),
      ]),
      Animated.parallel([
        Animated.timing(fadeActions, { toValue: 1, duration: 400, useNativeDriver: ND }),
        Animated.timing(slideActions, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      ]),
      Animated.parallel([
        Animated.timing(fadeSelector, { toValue: 1, duration: 400, useNativeDriver: ND }),
        Animated.timing(slideSelector, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      ]),
    ]);
    a.start();
    return () => a.stop();
  }, []);

  const cycleCount = count === 0 ? 0 : ((count - 1) % currentTarget) + 1;

  /* ── Single bead count ── */
  const doCount = useCallback(() => {
    if (hapticOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tapSoundOn) playTapSound();
    setCount((c) => {
      const next = c + 1;
      if (next > 0 && next % currentTarget === 0) {
        if (targetVibrationEnabled) {
          setTimeout(() => Vibration.vibrate([0, 40, 60, 40]), 100);
          if (hapticOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        saveDhikrSession(currentDhikr.id, currentTarget).catch(() => {});
        if (onTargetReached) onTargetReached();
      }
      return next;
    });
    incrementDhikrCount(currentDhikr.id).catch(() => {});
    setTotalCount((p) => p + 1);
    setAllTotals((p) => ({ ...p, [currentDhikr.id]: (p[currentDhikr.id] || 0) + 1 }));
    if (onTap) onTap();
  }, [currentTarget, currentDhikr.id, tapSoundOn, hapticOn, targetVibrationEnabled, onTargetReached, onTap]);

  const doCountRef = useRef(doCount);
  doCountRef.current = doCount;

  /* ── Multi-phase physics animation ── */
  const runConveyorAnimation = useCallback((intensity = 1) => {
    if (animating.current) return;
    animating.current = true;

    // Clear lingering timers & stop running animations from previous cycle
    clearTimeout(impactTimer.current);
    clearTimeout(swingTimer.current);
    clearTimeout(hapticTimer.current);
    progress.stopAnimation();
    impactWave.stopAnimation();
    swingPhase.stopAnimation();
    pulseAnim.stopAnimation();

    progress.setValue(0);
    impactWave.setValue(0);
    swingPhase.setValue(0);
    pulseAnim.setValue(1);

    // Duration: fast swipe → quicker; gentle tap → standard
    const dur = Math.round(480 / Math.max(intensity, 0.6));

    // ─ Phase 1: Main bead travel ─
    // Timing with front-loaded easing; the interpolation curves define ALL physics
    Animated.timing(progress, {
      toValue: 1,
      duration: dur,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      // DON'T reset progress/impactWave here — progress=1 is visually identical
      // to progress=0 (conveyor advanced by one bead = same positions).
      // Resetting here caused a 1-frame flicker where all beads snapped back.
      // Values are only reset at the START of the next animation (same JS tick).
      impactWave.stopAnimation();
      impactWave.setValue(1);  // snap bounces to 0 (all bounces output 0 at impactWave=1)
      animating.current = false;
    });

    // ─ Phase 2: Scale pulse — snap + spring ─
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.955, duration: 40, easing: Easing.out(Easing.quad), useNativeDriver: false,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1, damping: 8, stiffness: 160, mass: 0.5, useNativeDriver: false,
      }),
    ]).start();

    // ─ Phase 3: Impact wave — fires when bead hits bottom group ─
    impactTimer.current = setTimeout(() => {
      Animated.timing(impactWave, {
        toValue: 1,
        duration: Math.round(dur * 0.95),
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }, Math.round(dur * 0.52));

    // ─ Phase 4: Rope pendulum — slow dampened swing, outlasts bead travel ─
    swingTimer.current = setTimeout(() => {
      Animated.timing(swingPhase, {
        toValue: 1,
        duration: Math.round(dur * 1.9),
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,  // drives SVG path d string
      }).start();
    }, Math.round(dur * 0.06));

    // ─ Phase 5: Delayed collision haptic ─
    if (hapticOnRef.current) {
      hapticTimer.current = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, Math.round(dur * 0.55));
    }

    doCountRef.current();
  }, [progress, impactWave, swingPhase, pulseAnim]);

  const runConveyorRef = useRef(runConveyorAnimation);
  runConveyorRef.current = runConveyorAnimation;

  /* ── PanResponder: velocity-aware tap + swipe ── */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
      onPanResponderGrant: () => {
        swipeCounted.current = false;
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.vy) > 0.3 && !swipeCounted.current) {
          swipeCounted.current = true;
          const vel = Math.min(Math.abs(gs.vy), 3);
          runConveyorRef.current(vel);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (!swipeCounted.current && Math.abs(gs.dy) <= 8) {
          runConveyorRef.current(1);
        }
      },
    })
  ).current;

  /* ── Reset handlers ── */
  const handleReset = useCallback(() => {
    Alert.alert(t.reset, t.resetConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.reset, style: 'destructive', onPress: () => {
          setCount(0);
          progress.setValue(0);
          impactWave.setValue(0);
          swingPhase.setValue(0);
          if (onReset) onReset();
        },
      },
    ]);
  }, [t, progress, impactWave, swingPhase, onReset]);

  const handleResetAll = useCallback(() => {
    Alert.alert(t.resetAll, t.resetAllConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.reset, style: 'destructive', onPress: async () => {
          await resetDhikr(currentDhikr.id);
          setCount(0);
          setTotalCount(0);
          setAllTotals((p) => ({ ...p, [currentDhikr.id]: 0 }));
          progress.setValue(0);
          impactWave.setValue(0);
          swingPhase.setValue(0);
          if (onReset) onReset();
        },
      },
    ]);
  }, [t, progress, impactWave, swingPhase, currentDhikr.id, onReset]);

  const selectDhikr = useCallback((idx) => {
    onSelectDhikr(idx);
    setCount(0);
    progress.setValue(0);
    impactWave.setValue(0);
    swingPhase.setValue(0);
  }, [progress, impactWave, swingPhase, onSelectDhikr]);

  /* ── Render ── */
  return (
    <View style={s.wrapper}>
      <Animated.View style={[s.mainSection, { opacity: fadeIn, transform: [{ scale: scaleIn }] }]}>
        {/* Counter */}
        <View style={s.counterDisplay}>
          <Text style={[s.counterCount, { fontSize: 44 * fontScale }]}>{totalCount}</Text>
          <Text style={[s.counterArabic, { fontSize: 14 * fontScale }]}>{currentDhikr.arabic}</Text>
        </View>

        {/* Bead chain — tap & swipe */}
        <View style={s.chainArea} {...panResponder.panHandlers}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TasbihChainSvg progress={progress} impactWave={impactWave} swingPhase={swingPhase} />
          </Animated.View>
        </View>

        <Text style={[s.currentLabel, { fontSize: 16 * fontScale }]}>{t[currentDhikr.id] || currentDhikr.label}</Text>

        {/* Actions */}
        <Animated.View style={[s.actions, { opacity: fadeActions, transform: [{ translateY: slideActions }] }]}>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Pressable style={({ pressed }) => [s.actionBtn, pressed && s.pressed]} onPress={handleReset}>
              <View style={s.actionCircle}>
                <Ionicons name="refresh" size={18} color={colors.accent} />
              </View>
              <Text style={s.actionLabel}>{t.reset}</Text>
            </Pressable>
          </View>

          <View style={s.progressBadge}>
            <Text style={s.progressLabel}>{t.progress}</Text>
            <Text style={s.progressValue}>{cycleCount} / {currentTarget}</Text>
          </View>

          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Pressable style={({ pressed }) => [s.actionBtn, pressed && s.pressed]} onPress={handleResetAll}>
              <View style={[s.actionCircle, s.actionCircleMuted]}>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </View>
              <Text style={[s.actionLabel, { color: colors.textMuted }]}>{t.all}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Dhikr selector */}
      <Animated.View style={[s.selectorSection, { opacity: fadeSelector, transform: [{ translateY: slideSelector }] }]}>
        <Text style={s.selectorTitle}>{t.selectDhikr}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectorScroll}>
          {dhikrs.map((d, idx) => {
            const active = idx === selectedIdx;
            return (
              <Pressable key={d.id} style={[s.chip, active && s.chipActive]} onPress={() => selectDhikr(idx)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{t[d.id] || d.label}</Text>
                <Text style={[s.chipCount, active && s.chipCountActive]}>{allTotals[d.id] || 0}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const createStyles = (fs = 1) => ({
  wrapper: { flex: 1 },
  mainSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterDisplay: {
    alignItems: 'center',
    marginBottom: 2,
  },
  counterCount: {
    color: colors.textPrimary,
    fontWeight: '200',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  counterArabic: {
    color: colors.accent,
    fontWeight: '400',
    opacity: 0.9,
    marginTop: 2,
  },
  chainArea: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  currentLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  actionBtn: { alignItems: 'center', padding: 8, gap: 4 },
  pressed: { opacity: 0.6 },
  actionCircle: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: colors.divider,
    backgroundColor: 'rgba(10,46,40,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionCircleMuted: { borderColor: 'rgba(107,128,112,0.25)' },
  actionLabel: { color: colors.accent, fontSize: 10, fontWeight: '600' },
  progressBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(200,161,90,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200,161,90,0.18)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginHorizontal: 8,
  },
  progressLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
  progressValue: { color: colors.accent, fontSize: 22, fontWeight: '300', fontVariant: ['tabular-nums'] },
  selectorSection: {
    paddingBottom: 84,
    marginTop: 24,
  },
  selectorTitle: {
    color: colors.accent, fontSize: 10, fontWeight: '600',
    letterSpacing: 3, textAlign: 'center', marginBottom: 5, opacity: 0.7,
  },
  selectorScroll: { paddingHorizontal: 16, gap: 10 },
  chip: {
    backgroundColor: 'rgba(10,38,34,0.85)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(133,158,116,0.15)',
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center', minWidth: 100,
  },
  chipActive: { backgroundColor: 'rgba(200,161,90,0.12)', borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  chipTextActive: { color: colors.accent },
  chipCount: { color: colors.textMuted, fontSize: 10, fontWeight: '500' },
  chipCountActive: { color: colors.accentSoft },
});
