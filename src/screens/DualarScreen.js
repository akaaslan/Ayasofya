import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import { getGrandTotal, saveDhikrCount } from '../utils/dhikrStorage';

/* ── Preset dhikr list ─────────────────────────── */
const DHIKRS = [
  { id: 'subhanallah', label: 'Sübhanallah',   arabic: 'سُبْحَانَ اللّٰهِ',         target: 33 },
  { id: 'elhamdulillah', label: 'Elhamdülillah', arabic: 'اَلْحَمْدُ لِلّٰهِ',       target: 33 },
  { id: 'allahuekber', label: 'Allahu Ekber',   arabic: 'اَللّٰهُ أَكْبَرُ',          target: 33 },
  { id: 'lailaheillallah', label: 'Lâ İlâhe İllallah', arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ', target: 99 },
  { id: 'estagfirullah', label: 'Estağfirullah', arabic: 'أَسْتَغْفِرُ اللّٰهَ',     target: 99 },
  { id: 'salavat', label: 'Salavat',            arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', target: 99 },
];

/* ── Tick positions around the counter ring ──── */
const RING_SIZE   = 260;
const TICK_COUNT  = 33;
const TICK_R      = RING_SIZE / 2 + 14;
const CENTER      = RING_SIZE / 2 + 18;
const CONTAINER   = RING_SIZE + 36;

const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const a = (i * 2 * Math.PI) / TICK_COUNT - Math.PI / 2;
  return {
    left: CENTER + Math.cos(a) * TICK_R - 1.5,
    top:  CENTER + Math.sin(a) * TICK_R - 1.5,
  };
});

/* ── Component ─────────────────────────────────── */
export function DualarScreen() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /* ── Load persisted grand total on mount ── */
  useEffect(() => {
    getGrandTotal().then((t) => setTotalCount(t));
  }, []);

  /* ── Entrance animations ── */
  const fadeHeader   = useRef(new Animated.Value(0)).current;
  const slideHeader  = useRef(new Animated.Value(-20)).current;
  const fadeRing     = useRef(new Animated.Value(0)).current;
  const scaleRing    = useRef(new Animated.Value(0.85)).current;
  const fadeActions  = useRef(new Animated.Value(0)).current;
  const slideActions = useRef(new Animated.Value(30)).current;
  const fadeSelector = useRef(new Animated.Value(0)).current;
  const slideSelector = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeHeader, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
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
    ]).start();
  }, []);

  const current = DHIKRS[selectedIdx];
  const progress = Math.min(count / current.target, 1);

  /* ── Pulse animation on tap ── */
  const triggerPulse = useCallback(() => {
    pulseAnim.setValue(0.92);
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [pulseAnim]);

  /* ── Count tap ── */
  const handleTap = useCallback(() => {
    triggerPulse();
    Vibration.vibrate(Platform.OS === 'ios' ? 3 : 15);
    setCount((c) => {
      const next = c + 1;
      if (next === current.target) {
        // Completed a round — gentle double vibration + save to storage
        setTimeout(() => Vibration.vibrate([0, 40, 60, 40]), 100);
        saveDhikrCount(current.id, current.target).catch(() => {});
      }
      return next;
    });
    setTotalCount((t) => t + 1);
  }, [current.target, current.id, triggerPulse]);

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    Alert.alert(
      'Sıfırla',
      'Sayacı sıfırlamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sıfırla', style: 'destructive', onPress: () => setCount(0) },
      ],
    );
  }, []);

  /* ── Reset all ── */
  const handleResetAll = useCallback(() => {
    Alert.alert(
      'Tümünü Sıfırla',
      'Sayacı sıfırlamak istediğinize emin misiniz?\n(Geçmiş veriler kayıtlı kalır)',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => { setCount(0); setTotalCount(0); },
        },
      ],
    );
  }, []);

  /* ── Select dhikr ── */
  const selectDhikr = useCallback((idx) => {
    setSelectedIdx(idx);
    setCount(0);
  }, []);

  /* ── Progress arc (simple dots-based) ── */
  const filledTicks = Math.round(progress * TICK_COUNT);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <Animated.Text style={[styles.header, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
          ZİKİRMATİK
        </Animated.Text>

        {/* ── Main counter area ── */}
        <Animated.View style={[styles.counterSection, { opacity: fadeRing, transform: [{ scale: scaleRing }] }]}>
          <Pressable onPress={handleTap} style={styles.tapArea}>
            <Animated.View style={[styles.ringContainer, { transform: [{ scale: pulseAnim }] }]}>
              {/* Tick dots — filled vs unfilled */}
              {TICKS.map((pos, i) => (
                <View
                  key={i}
                  style={[
                    styles.tick,
                    { left: pos.left, top: pos.top },
                    i < filledTicks && styles.tickFilled,
                  ]}
                />
              ))}

              {/* Outer decorative ring */}
              <View style={styles.outerRing}>
                {/* Main gold ring */}
                <View style={styles.goldRing}>
                  {/* Inner subtle ring */}
                  <View style={styles.innerRing}>
                    {/* Arabic text */}
                    <Text style={styles.arabicText}>{current.arabic}</Text>

                    {/* Count */}
                    <Text style={styles.countText}>{count}</Text>

                    {/* Target */}
                    <Text style={styles.targetText}>/ {current.target}</Text>

                    {/* Tap hint */}
                    <Text style={styles.tapHint}>DOKUN VE ZİKRET</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </Pressable>

          {/* ── Action buttons under ring ── */}
          <Animated.View style={[styles.actions, { opacity: fadeActions, transform: [{ translateY: slideActions }] }]}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
              onPress={handleReset}
              accessibilityLabel="Sıfırla"
            >
              <Ionicons name="refresh" size={20} color={colors.accent} />
              <Text style={styles.actionLabel}>Sıfırla</Text>
            </Pressable>

            <View style={styles.totalBadge}>
              <Text style={styles.totalLabel}>TOPLAM</Text>
              <Text style={styles.totalValue}>{totalCount}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
              onPress={handleResetAll}
              accessibilityLabel="Tümünü sıfırla"
            >
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Tümü</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ── Dhikr selector ── */}
        <Animated.View style={[styles.selectorSection, { opacity: fadeSelector, transform: [{ translateY: slideSelector }] }]}>
          <Text style={styles.selectorTitle}>✦  ZİKİR SEÇ  ✦</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {DHIKRS.map((d, idx) => {
              const active = idx === selectedIdx;
              return (
                <Pressable
                  key={d.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => selectDhikr(idx)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {d.label}
                  </Text>
                  <Text style={[styles.chipTarget, active && styles.chipTargetActive]}>
                    ×{d.target}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Styles ─────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 44,
    marginBottom: 8,
  },

  /* Counter area */
  counterSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },

  tapArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringContainer: {
    width: CONTAINER,
    height: CONTAINER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tick dots */
  tick: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(200, 161, 90, 0.2)',
  },
  tickFilled: {
    backgroundColor: colors.accent,
    opacity: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowColor: colors.accentGlow,
    shadowOpacity: 0.6,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },

  /* Rings */
  outerRing: {
    width: RING_SIZE + 8,
    height: RING_SIZE + 8,
    borderRadius: (RING_SIZE + 8) / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 161, 90, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 24, 20, 0.5)',
  },
  innerRing: {
    width: RING_SIZE - 34,
    height: RING_SIZE - 34,
    borderRadius: (RING_SIZE - 34) / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 161, 90, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  /* Text inside ring */
  arabicText: {
    color: colors.accent,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  countText: {
    color: colors.textPrimary,
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    lineHeight: 62,
  },
  targetText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '400',
    marginTop: -2,
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.5,
  },

  /* Action buttons */
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 32,
  },
  actionBtn: {
    alignItems: 'center',
    padding: 10,
    gap: 4,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },

  /* Total badge */
  totalBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.15)',
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 2,
  },
  totalValue: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },

  /* Dhikr selector */
  selectorSection: {
    paddingBottom: 100,
  },
  selectorTitle: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.7,
  },
  selectorScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  chipActive: {
    backgroundColor: 'rgba(200, 161, 90, 0.12)',
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  chipTextActive: {
    color: colors.accent,
  },
  chipTarget: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  chipTargetActive: {
    color: colors.accentSoft,
  },
});
