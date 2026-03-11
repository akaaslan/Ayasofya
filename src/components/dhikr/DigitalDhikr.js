import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { getGrandTotal, saveDhikrCount } from '../../utils/dhikrStorage';

const { width: W } = Dimensions.get('window');

const DHIKRS = [
  { id: 'subhanallah', label: 'Sübhanallah', arabic: 'سُبْحَانَ اللّٰهِ', target: 33 },
  { id: 'elhamdulillah', label: 'Elhamdülillah', arabic: 'اَلْحَمْدُ لِلّٰهِ', target: 33 },
  { id: 'allahuekber', label: 'Allahu Ekber', arabic: 'اَللّٰهُ أَكْبَرُ', target: 33 },
  { id: 'lailaheillallah', label: 'Lâ İlâhe İllallah', arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ', target: 99 },
  { id: 'estagfirullah', label: 'Estağfirullah', arabic: 'أَسْتَغْفِرُ اللّٰهَ', target: 99 },
  { id: 'salavat', label: 'Salavat', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', target: 99 },
];

/* ── SVG progress ring constants ──────────────── */
const RING_OUTER_SIZE = Math.min(W * 0.65, 260);
const RING_CX = RING_OUTER_SIZE / 2;
const RING_CY = RING_OUTER_SIZE / 2;
const RING_R = RING_OUTER_SIZE / 2 - 12;
const STROKE_W = 6;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

function ProgressRingSvg({ progress }) {
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  return (
    <Svg width={RING_OUTER_SIZE} height={RING_OUTER_SIZE}>
      <Defs>
        <RadialGradient id="digFace" cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor="#0e3e32" />
          <Stop offset="100%" stopColor="#061e1a" />
        </RadialGradient>
      </Defs>
      {/* Face */}
      <Circle cx={RING_CX} cy={RING_CY} r={RING_R - STROKE_W}
        fill="url(#digFace)" />
      {/* Track */}
      <Circle cx={RING_CX} cy={RING_CY} r={RING_R}
        fill="none" stroke="rgba(200,161,90,0.1)" strokeWidth={STROKE_W} />
      {/* Progress */}
      <Circle cx={RING_CX} cy={RING_CY} r={RING_R}
        fill="none" stroke={colors.accent} strokeWidth={STROKE_W}
        strokeLinecap="round" strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90, ${RING_CX}, ${RING_CY})`} />
      {/* Segment ticks (every 25%) */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180 - Math.PI / 2;
        const inner = RING_R - STROKE_W - 2;
        const outer = RING_R + STROKE_W + 2;
        return (
          <Line key={deg}
            x1={RING_CX + inner * Math.cos(rad)} y1={RING_CY + inner * Math.sin(rad)}
            x2={RING_CX + outer * Math.cos(rad)} y2={RING_CY + outer * Math.sin(rad)}
            stroke="rgba(200,161,90,0.2)" strokeWidth={1.5} />
        );
      })}
    </Svg>
  );
}

export function DigitalDhikr() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getGrandTotal().then((t) => setTotalCount(t));
  }, []);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const current = DHIKRS[selectedIdx];
  const progress = Math.min(count / current.target, 1);

  const triggerPulse = useCallback(() => {
    pulseAnim.setValue(0.95);
    countAnim.setValue(1.15);
    Animated.parallel([
      Animated.timing(pulseAnim, {
        toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: 1, duration: 250, easing: Easing.out(Easing.back(2)), useNativeDriver: true,
      }),
    ]).start();
  }, [pulseAnim, countAnim]);

  const handleTap = useCallback(() => {
    triggerPulse();
    Vibration.vibrate(Platform.OS === 'ios' ? 3 : 15);
    setCount((c) => {
      const next = c + 1;
      if (next >= current.target) {
        setTimeout(() => Vibration.vibrate([0, 40, 60, 40]), 100);
        saveDhikrCount(current.id, current.target).catch(() => {});
        setRounds((r) => r + 1);
        return 0;
      }
      return next;
    });
    setTotalCount((t) => t + 1);
  }, [current.target, current.id, triggerPulse]);

  const handleReset = useCallback(() => {
    Alert.alert('Sıfırla', 'Sayacı sıfırlamak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: () => { setCount(0); setRounds(0); } },
    ]);
  }, []);

  const handleResetAll = useCallback(() => {
    Alert.alert('Tümünü Sıfırla', 'Sayacı sıfırlamak istediğinize emin misiniz?\n(Geçmiş veriler kayıtlı kalır)', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: () => { setCount(0); setRounds(0); setTotalCount(0); } },
    ]);
  }, []);

  const selectDhikr = useCallback((idx) => {
    setSelectedIdx(idx);
    setCount(0);
    setRounds(0);
  }, []);

  const pct = Math.round(progress * 100);

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
      {/* Arabic label */}
      <Text style={s.arabicText}>{current.arabic}</Text>
      <Text style={s.turkishLabel}>{current.label}</Text>

      {/* Ring + count */}
      <Pressable onPress={handleTap} style={s.tapArea}>
        <Animated.View style={[s.ringWrap, { transform: [{ scale: pulseAnim }] }]}>
          <ProgressRingSvg progress={progress} />
          <View style={s.ringContent}>
            <Animated.Text style={[s.countText, { transform: [{ scale: countAnim }] }]}>
              {count}
            </Animated.Text>
            <Text style={s.targetText}>/ {current.target}</Text>
          </View>
        </Animated.View>
      </Pressable>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statValue}>{pct}%</Text>
          <Text style={s.statLabel}>İLERLEME</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{rounds}</Text>
          <Text style={s.statLabel}>TUR</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{totalCount}</Text>
          <Text style={s.statLabel}>TOPLAM</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={s.actions}>
        <Pressable style={({ pressed }) => [s.actionBtn, pressed && s.actionPressed]} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color={colors.accent} />
          <Text style={s.actionBtnText}>Sıfırla</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [s.actionBtn, s.actionBtnMuted, pressed && s.actionPressed]} onPress={handleResetAll}>
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          <Text style={[s.actionBtnText, { color: colors.textMuted }]}>Tümü</Text>
        </Pressable>
      </View>

      {/* Dhikr selector */}
      <View style={s.selectorSection}>
        <Text style={s.selectorTitle}>✦  ZİKİR SEÇ  ✦</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectorScroll}>
          {DHIKRS.map((d, idx) => {
            const active = idx === selectedIdx;
            return (
              <Pressable key={d.id} style={[s.chip, active && s.chipActive]} onPress={() => selectDhikr(idx)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{d.label}</Text>
                <Text style={[s.chipTarget, active && s.chipTargetActive]}>×{d.target}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', paddingTop: 4 },

  arabicText: {
    color: colors.accent, fontSize: 22, textAlign: 'center', lineHeight: 34, opacity: 0.9,
  },
  turkishLabel: {
    color: colors.textSecondary, fontSize: 14, fontWeight: '600', letterSpacing: 1, marginTop: 2, marginBottom: 12,
  },

  tapArea: { alignItems: 'center', justifyContent: 'center' },
  ringWrap: {
    width: RING_OUTER_SIZE, height: RING_OUTER_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  ringContent: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  countText: {
    color: colors.textPrimary, fontSize: 64, fontWeight: '200', fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), lineHeight: 70,
  },
  targetText: {
    color: colors.textMuted, fontSize: 16, fontWeight: '400', marginTop: -2, fontVariant: ['tabular-nums'],
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,46,40,0.7)', borderRadius: 16,
    borderWidth: 1, borderColor: colors.divider,
    paddingVertical: 12, paddingHorizontal: 20,
    marginTop: 18, marginBottom: 16,
  },
  statItem: { alignItems: 'center', paddingHorizontal: 16 },
  statValue: {
    color: colors.accent, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 1.5, marginTop: 2,
  },
  statDivider: { width: 1, height: 30, backgroundColor: colors.divider },

  /* Actions */
  actions: {
    flexDirection: 'row', gap: 14, marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.accent,
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14,
  },
  actionBtnMuted: {
    borderColor: 'rgba(107,128,112,0.3)',
  },
  actionPressed: { opacity: 0.6 },
  actionBtnText: {
    color: colors.accent, fontSize: 13, fontWeight: '700',
  },

  /* Selector */
  selectorSection: { paddingBottom: 100, width: '100%' },
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
