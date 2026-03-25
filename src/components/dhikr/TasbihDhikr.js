import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
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
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import { colors } from '../../theme/colors';
import { getDhikrTotal, getGrandTotal, saveDhikrSession, getDhikrData, incrementDhikrCount } from '../../utils/dhikrStorage';
import { getFontSize, getTapSoundEnabled } from '../../utils/preferences';
import { playTapSound } from '../../utils/tapSound';

const AnimatedG = Animated.createAnimatedComponent(G);

const { width: W } = Dimensions.get('window');

const SVG_SIZE = Math.min(W * 0.82, 340);
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const BEAD_RING_R = SVG_SIZE / 2 - 24;
const BEAD_R = 8;
const IMAME_R = 11;

function polarXY(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function TasbihRingSvg({ count, totalCount, target, arabic, progress, rotateAnim, fontScale = 1, t }) {
  const beadCount = Math.min(target, 33);
  const filledBeads = Math.round(progress * beadCount);

  const beads = [];
  for (let i = 0; i < beadCount; i++) {
    const deg = (i / beadCount) * 360;
    const { x, y } = polarXY(deg, BEAD_RING_R);
    const filled = i < filledBeads;
    beads.push(
      <G key={`b${i}`}>
        <Circle cx={x} cy={y} r={BEAD_R}
          fill={filled ? 'url(#beadFilled)' : 'url(#beadEmpty)'}
          stroke={filled ? colors.accent : 'rgba(200,161,90,0.25)'}
          strokeWidth={filled ? 1.2 : 0.6}
        />
        {filled && (
          <Circle cx={x} cy={y} r={BEAD_R + 3}
            fill="none" stroke={colors.accentGlow} strokeWidth={0.4} opacity={0.4} />
        )}
      </G>,
    );
  }

  const imameP = polarXY(0, BEAD_RING_R + IMAME_R + 4);

  const arcR = BEAD_RING_R;
  const arcAngle = progress * 360;
  const arcRad = (arcAngle * Math.PI) / 180;
  const largeArc = arcAngle > 180 ? 1 : 0;
  const arcEnd = {
    x: CX + arcR * Math.sin(arcRad),
    y: CY - arcR * Math.cos(arcRad),
  };
  const progressArc = arcAngle > 0.5
    ? `M${CX},${CY - arcR} A${arcR},${arcR} 0 ${largeArc} 1 ${arcEnd.x},${arcEnd.y}`
    : '';

  return (
    <Svg width={SVG_SIZE} height={SVG_SIZE + 30}>
      <Defs>
        <RadialGradient id="beadFilled" cx="40%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#e8c96e" />
          <Stop offset="100%" stopColor="#9a7730" />
        </RadialGradient>
        <RadialGradient id="beadEmpty" cx="40%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#1a4a3e" />
          <Stop offset="100%" stopColor="#0a2e24" />
        </RadialGradient>
        <SvgLinearGradient id="imameGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#e8c96e" />
          <Stop offset="50%" stopColor="#c8a15a" />
          <Stop offset="100%" stopColor="#8a6d2e" />
        </SvgLinearGradient>
        <RadialGradient id="faceBg" cx="50%" cy="45%" r="50%">
          <Stop offset="0%" stopColor="#0e3e32" />
          <Stop offset="100%" stopColor="#061e1a" />
        </RadialGradient>
        <SvgLinearGradient id="tassleGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.accent} />
          <Stop offset="100%" stopColor="#6b4d1e" />
        </SvgLinearGradient>
      </Defs>

      <Circle cx={CX} cy={CY} r={BEAD_RING_R - 20}
        fill="url(#faceBg)" stroke="rgba(200,161,90,0.1)" strokeWidth={0.5} />
      <Circle cx={CX} cy={CY} r={BEAD_RING_R}
        fill="none" stroke="rgba(200,161,90,0.06)" strokeWidth={18} />
      {progressArc !== '' && (
        <Path d={progressArc} fill="none"
          stroke="rgba(200,161,90,0.12)" strokeWidth={20} strokeLinecap="round" />
      )}
      {/* Beads + imame + tassel: only these rotate */}
      <AnimatedG rotation={rotateAnim} originX={CX} originY={CY}>
        {beads}

        <Circle cx={imameP.x} cy={imameP.y} r={IMAME_R}
          fill="url(#imameGrad)" stroke="#dbb866" strokeWidth={1.5} />
        <Circle cx={imameP.x - 2} cy={imameP.y - 3} r={3}
          fill="rgba(255,255,255,0.25)" />
        <Line x1={imameP.x} y1={imameP.y - IMAME_R - 1}
          x2={imameP.x} y2={imameP.y - IMAME_R - 22}
          stroke="url(#tassleGrad)" strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={imameP.x} y1={imameP.y - IMAME_R - 22}
          x2={imameP.x - 6} y2={imameP.y - IMAME_R - 36}
          stroke="url(#tassleGrad)" strokeWidth={2} strokeLinecap="round" />
        <Line x1={imameP.x} y1={imameP.y - IMAME_R - 22}
          x2={imameP.x + 6} y2={imameP.y - IMAME_R - 36}
          stroke="url(#tassleGrad)" strokeWidth={2} strokeLinecap="round" />
        <Circle cx={imameP.x} cy={imameP.y - IMAME_R - 22}
          r={3} fill={colors.accent} />
      </AnimatedG>

      <SvgText x={CX} y={CY - 24} fill={colors.accent}
        fontSize={16 * fontScale} fontWeight="400" textAnchor="middle" opacity={0.9}>
        {arabic}
      </SvgText>
      <SvgText x={CX} y={CY + 18} fill={colors.textPrimary}
        fontSize={50 * fontScale} fontWeight="200" textAnchor="middle"
        fontFamily={Platform.select({ ios: 'Georgia', android: 'serif' })}>
        {totalCount}
      </SvgText>
      <SvgText x={CX} y={CY + 62} fill={colors.textMuted}
        fontSize={8} fontWeight="700" textAnchor="middle" letterSpacing={2.5}>
        {t.touchAndDhikr}
      </SvgText>
    </Svg>
  );
}

export function TasbihDhikr({ selectedIdx, onSelectDhikr, currentTarget, currentDhikr, dhikrs, onTargetReached, targetVibrationEnabled, onTap }) {
  useTheme();
  const { t } = useI18n();
  const s = createStyles();
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [allTotals, setAllTotals] = useState({});
  const [fontScale, setFontScale] = useState(1);
  const [tapSoundOn, setTapSoundOn] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateTarget = useRef(0);

  useFocusEffect(
    useCallback(() => {
      getFontSize().then(level => setFontScale([0.8, 1, 1.25][level] || 1));
      getTapSoundEnabled().then(setTapSoundOn);
    }, [])
  );

  useEffect(() => {
    getDhikrTotal(currentDhikr.id).then((t) => setTotalCount(t));
    getDhikrData().then(data => setAllTotals(data.totals));
  }, [currentDhikr.id]);

  const fadeRing = useRef(new Animated.Value(0)).current;
  const scaleRing = useRef(new Animated.Value(0.85)).current;
  const fadeActions = useRef(new Animated.Value(0)).current;
  const slideActions = useRef(new Animated.Value(30)).current;
  const fadeSelector = useRef(new Animated.Value(0)).current;
  const slideSelector = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const anim = Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeRing, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleRing, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeActions, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideActions, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeSelector, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideSelector, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const cycleCount = count === 0 ? 0 : ((count - 1) % currentTarget) + 1;
  const progress = currentTarget === 0 ? 0 : cycleCount / currentTarget;

  const beadStep = 360 / Math.min(currentTarget, 33);

  const triggerPulse = useCallback(() => {
    pulseAnim.setValue(0.92);
    Animated.timing(pulseAnim, {
      toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();

    // Cumulative rotation: each tap rotates one bead-step left and stays
    rotateTarget.current -= beadStep;
    Animated.spring(rotateAnim, {
      toValue: rotateTarget.current, friction: 7, tension: 50, useNativeDriver: true,
    }).start();
  }, [pulseAnim, rotateAnim, beadStep]);

  const handleTap = useCallback(() => {
    triggerPulse();
    Haptics.selectionAsync();
    if (tapSoundOn) playTapSound();
    setCount((c) => {
      const next = c + 1;
      if (next > 0 && next % currentTarget === 0) {
        if (targetVibrationEnabled) {
          setTimeout(() => Vibration.vibrate([0, 40, 60, 40]), 100);
        }
        saveDhikrSession(currentDhikr.id, currentTarget).catch(e => console.warn('Session save error:', e));
        if (onTargetReached) {
          onTargetReached();
        }
      }
      return next;
    });

    // Save +1 to database immediately for persistence
    incrementDhikrCount(currentDhikr.id).catch(e => console.warn('Dhikr increment error:', e));

    setTotalCount((t) => t + 1);
    setAllTotals((prev) => ({ ...prev, [currentDhikr.id]: (prev[currentDhikr.id] || 0) + 1 }));
    
    if (onTap) onTap();
  }, [currentTarget, currentDhikr.id, triggerPulse, tapSoundOn, targetVibrationEnabled, onTargetReached, onTap]);



  const handleReset = useCallback(() => {
    Alert.alert(t.reset, t.resetConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.reset, style: 'destructive', onPress: () => { setCount(0); rotateTarget.current = 0; rotateAnim.setValue(0); } },
    ]);
  }, [t, rotateAnim, rotateTarget]);

  const handleResetAll = useCallback(() => {
    Alert.alert(t.resetAll, t.resetAllConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.reset, style: 'destructive', onPress: () => { setCount(0); setTotalCount(0); rotateTarget.current = 0; rotateAnim.setValue(0); } },
    ]);
  }, [t, rotateAnim, rotateTarget]);

  const selectDhikr = useCallback((idx) => {
    onSelectDhikr(idx);
    setCount(0);
    rotateTarget.current = 0;
    rotateAnim.setValue(0);
  }, [rotateAnim, onSelectDhikr]);

  return (
    <View style={s.wrapper}>
      <Animated.View style={[s.counterSection, { opacity: fadeRing, transform: [{ scale: scaleRing }] }]}>
        <Pressable onPress={handleTap} style={s.tapArea}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TasbihRingSvg count={count} totalCount={totalCount} target={currentTarget} arabic={currentDhikr.arabic} progress={progress} rotateAnim={rotateAnim} fontScale={fontScale} t={t} />
          </Animated.View>
        </Pressable>

        <Text style={s.currentLabel}>{t[currentDhikr.id] || currentDhikr.label}</Text>

        <Animated.View style={[s.actions, { opacity: fadeActions, transform: [{ translateY: slideActions }] }]}>
          <Pressable style={({ pressed }) => [s.actionBtn, pressed && s.actionPressed]} onPress={handleReset}>
            <View style={s.actionCircle}>
              <Ionicons name="refresh" size={18} color={colors.accent} />
            </View>
            <Text style={s.actionLabel}>{t.reset}</Text>
          </Pressable>
          <View style={s.totalBadge}>
            <Text style={s.totalLabel}>{t.progress}</Text>
            <Text style={s.totalValue}>{cycleCount} / {currentTarget}</Text>
          </View>
          <Pressable style={({ pressed }) => [s.actionBtn, pressed && s.actionPressed]} onPress={handleResetAll}>
            <View style={[s.actionCircle, s.actionCircleMuted]}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </View>
            <Text style={[s.actionLabel, { color: colors.textMuted }]}>{t.all}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[s.selectorSection, { opacity: fadeSelector, transform: [{ translateY: slideSelector }] }]}>
        <Text style={s.selectorTitle}>{t.selectDhikr}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectorScroll}>
          {dhikrs.map((d, idx) => {
            const active = idx === selectedIdx;
            return (
              <Pressable key={d.id} style={[s.chip, active && s.chipActive]} onPress={() => selectDhikr(idx)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{t[d.id] || d.label}</Text>
                <Text style={[s.chipTarget, active && s.chipTargetActive]}>{allTotals[d.id] || 0}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const createStyles = () => ({
  wrapper: { flex: 1 },
  counterSection: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -16 },
  tapArea: { alignItems: 'center', justifyContent: 'center' },
  currentLabel: { color: colors.textSecondary, fontSize: 16, fontWeight: '600', letterSpacing: 1, marginTop: -8, marginBottom: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 28 },
  actionBtn: { alignItems: 'center', padding: 8, gap: 6 },
  actionPressed: { opacity: 0.6 },
  actionCircle: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: colors.divider, backgroundColor: 'rgba(10,46,40,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  actionCircleMuted: { borderColor: 'rgba(107,128,112,0.25)' },
  actionLabel: { color: colors.accent, fontSize: 10, fontWeight: '600' },
  totalBadge: {
    alignItems: 'center', backgroundColor: 'rgba(200,161,90,0.08)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(200,161,90,0.18)', paddingHorizontal: 26, paddingVertical: 12,
  },
  totalLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
  totalValue: { color: colors.accent, fontSize: 24, fontWeight: '300', fontVariant: ['tabular-nums'] },
  selectorSection: { paddingBottom: 100 },
  selectorTitle: { color: colors.accent, fontSize: 10, fontWeight: '600', letterSpacing: 3, textAlign: 'center', marginBottom: 12, opacity: 0.7 },
  selectorScroll: { paddingHorizontal: 16, gap: 10 },
  chip: {
    backgroundColor: 'rgba(10,38,34,0.85)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(133,158,116,0.15)', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', minWidth: 100,
  },
  chipActive: { backgroundColor: 'rgba(200,161,90,0.12)', borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  chipTextActive: { color: colors.accent },
  chipTarget: { color: colors.textMuted, fontSize: 10, fontWeight: '500' },
  chipTargetActive: { color: colors.accentSoft },
});
