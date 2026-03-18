import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

import { colors } from '../../theme/colors';
import { getDhikrTotal, getGrandTotal, saveDhikrSession, getDhikrData, incrementDhikrCount } from '../../utils/dhikrStorage';
import { CustomDialog } from '../CustomDialog';

const DHIKRS = [
  { id: 'subhanallah', label: 'Sübhanallah', arabic: 'سُبْحَانَ اللّٰهِ', target: 100 },
  { id: 'elhamdulillah', label: 'Elhamdülillah', arabic: 'اَلْحَمْدُ لِلّٰهِ', target: 100 },
  { id: 'allahuekber', label: 'Allahu Ekber', arabic: 'اَللّٰهُ أَكْبَرُ', target: 100 },
  { id: 'lailaheillallah', label: 'Lâ İlâhe İllallah', arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ', target: 100 },
  { id: 'estagfirullah', label: 'Estağfirullah', arabic: 'أَسْتَغْفِرُ اللّٰهَ', target: 100 },
  { id: 'salavat', label: 'Salavat', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', target: 100 },
];

const RING_SIZE = 260;
const TICK_COUNT = 33;
const TICK_R = RING_SIZE / 2 + 14;
const CENTER = RING_SIZE / 2 + 18;
const CONTAINER = RING_SIZE + 36;

const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const a = (i * 2 * Math.PI) / TICK_COUNT - Math.PI / 2;
  return {
    left: CENTER + Math.cos(a) * TICK_R - 1.5,
    top: CENTER + Math.sin(a) * TICK_R - 1.5,
  };
});

export function ClassicDhikr() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [allTotals, setAllTotals] = useState({});
  const [completionVisible, setCompletionVisible] = useState(false);
  const current = DHIKRS[selectedIdx];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load dhikr totals
  useEffect(() => {
    getDhikrTotal(current.id).then(t => setTotalCount(t));
    getDhikrData().then(data => setAllTotals(data.totals));
  }, [current.id]);



  const fadeRing = useRef(new Animated.Value(0)).current;
  const scaleRing = useRef(new Animated.Value(0.85)).current;
  const fadeActions = useRef(new Animated.Value(0)).current;
  const slideActions = useRef(new Animated.Value(30)).current;
  const fadeSelector = useRef(new Animated.Value(0)).current;
  const slideSelector = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.stagger(120, [
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


  const progress = Math.min(count / current.target, 1);
  const filledTicks = Math.round(progress * TICK_COUNT);

  const triggerPulse = useCallback(() => {
    pulseAnim.setValue(0.92);
    Animated.timing(pulseAnim, {
      toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  }, [pulseAnim]);

  const handleTap = useCallback(() => {
    triggerPulse();
    Haptics.selectionAsync();
    setCount((c) => {
      const next = c + 1;
      if (next === current.target) {
        setTimeout(() => Vibration.vibrate([0, 40, 60, 40]), 100);
        saveDhikrSession(current.id, current.target).catch(() => {});
        // Show prayer popup
        setTimeout(() => setCompletionVisible(true), 400);
      }
      return next;
    });
    
    // Save +1 to database immediately for persistence
    incrementDhikrCount(current.id).catch(() => {});

    setTotalCount((t) => t + 1);
    setAllTotals((prev) => ({ ...prev, [current.id]: (prev[current.id] || 0) + 1 }));
  }, [current.target, current.id, triggerPulse]);



  const handleReset = useCallback(() => {
    Alert.alert('Sıfırla', 'Sayacı sıfırlamak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: () => setCount(0) },
    ]);
  }, []);

  const handleResetAll = useCallback(() => {
    Alert.alert('Tümünü Sıfırla', 'Sayacı sıfırlamak istediğinize emin misiniz?\n(Geçmiş veriler kayıtlı kalır)', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: () => { setCount(0); setTotalCount(0); } },
    ]);
  }, []);

  const selectDhikr = useCallback((idx) => {
    setSelectedIdx(idx);
    setCount(0);
  }, []);

  return (
    <View style={s.wrapper}>
      <Animated.View style={[s.counterSection, { opacity: fadeRing, transform: [{ scale: scaleRing }] }]}>
        <Pressable onPress={handleTap} style={s.tapArea}>
          <Animated.View style={[s.ringContainer, { transform: [{ scale: pulseAnim }] }]}>
            {TICKS.map((pos, i) => (
              <View
                key={i}
                style={[s.tick, { left: pos.left, top: pos.top }, i < filledTicks && s.tickFilled]}
              />
            ))}
            <View style={s.outerRing}>
              <View style={s.goldRing}>
                <View style={s.innerRing}>
                  <Text style={s.arabicText}>{current.arabic}</Text>
                  <Text style={s.countText}>{totalCount}</Text>
                  <Text style={s.tapHint}>DOKUN VE ZİKRET</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </Pressable>

        <Animated.View style={[s.actions, { opacity: fadeActions, transform: [{ translateY: slideActions }] }]}>
          <Pressable style={({ pressed }) => [s.actionBtn, pressed && s.actionPressed]} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color={colors.accent} />
            <Text style={s.actionLabel}>Sıfırla</Text>
          </Pressable>
          <View style={s.totalBadge}>
            <Text style={s.totalLabel}>İLERLEME</Text>
            <Text style={s.totalValue}>{count} / {current.target}</Text>
          </View>
          <Pressable style={({ pressed }) => [s.actionBtn, pressed && s.actionPressed]} onPress={handleResetAll}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            <Text style={[s.actionLabel, { color: colors.textMuted }]}>Tümü</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <CustomDialog
        visible={completionVisible}
        icon="heart"
        title="Zikir Tamamlandı"
        message={`اللهم تقبل منا\n(Allahümme tekabbel minnâ)\n\nYa Rabbi, eksiklerimle beraber bu zikrimi katında kabul eyle, kalbime inşirah (ferahlık) ver.`}
        buttons={[{ text: 'Allah Kabul Etsin' }]}
        onClose={() => setCompletionVisible(false)}
      />

      <Animated.View style={[s.selectorSection, { opacity: fadeSelector, transform: [{ translateY: slideSelector }] }]}>
        <Text style={s.selectorTitle}>✦  ZİKİR SEÇ  ✦</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectorScroll}>
          {DHIKRS.map((d, idx) => {
            const active = idx === selectedIdx;
            return (
              <Pressable key={d.id} style={[s.chip, active && s.chipActive]} onPress={() => selectDhikr(idx)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{d.label}</Text>
                <Text style={[s.chipTarget, active && s.chipTargetActive]}>{allTotals[d.id] || 0}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  counterSection: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -10 },
  tapArea: { alignItems: 'center', justifyContent: 'center' },
  ringContainer: { width: CONTAINER, height: CONTAINER, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(200,161,90,0.2)' },
  tickFilled: {
    backgroundColor: colors.accent, opacity: 1, width: 4, height: 4, borderRadius: 2,
    shadowColor: colors.accentGlow, shadowOpacity: 0.6, shadowRadius: 3, shadowOffset: { width: 0, height: 0 },
  },
  outerRing: {
    width: RING_SIZE + 8, height: RING_SIZE + 8, borderRadius: (RING_SIZE + 8) / 2,
    borderWidth: 0.5, borderColor: 'rgba(200,161,90,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  goldRing: {
    width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
    borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(4,24,20,0.5)',
  },
  innerRing: {
    width: RING_SIZE - 34, height: RING_SIZE - 34, borderRadius: (RING_SIZE - 34) / 2,
    borderWidth: 0.5, borderColor: 'rgba(200,161,90,0.18)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  arabicText: { color: colors.accent, fontSize: 18, textAlign: 'center', marginBottom: 8, lineHeight: 28 },
  countText: {
    color: colors.textPrimary, fontSize: 56, fontWeight: '200', fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), lineHeight: 62,
  },
  targetText: { color: colors.textMuted, fontSize: 16, fontWeight: '400', marginTop: -2, marginBottom: 8, fontVariant: ['tabular-nums'] },
  tapHint: { color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 2.5 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, gap: 32 },
  actionBtn: { alignItems: 'center', padding: 10, gap: 4 },
  actionPressed: { opacity: 0.6 },
  actionLabel: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  totalBadge: {
    alignItems: 'center', backgroundColor: 'rgba(200,161,90,0.08)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(200,161,90,0.15)', paddingHorizontal: 22, paddingVertical: 10,
  },
  totalLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
  totalValue: { color: colors.accent, fontSize: 22, fontWeight: '300', fontVariant: ['tabular-nums'] },
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
