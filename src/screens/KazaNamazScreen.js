import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomDialog } from '../components/CustomDialog';
import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import {
  decrementKaza,
  getKazaCounts,
  getTotalKaza,
  incrementKaza,
  resetAllKaza,
} from '../utils/kazaTracking';

/* ── Prayer info ─────────────────────────────────── */
const PRAYERS = [
  { key: 'sabah',   label: 'Sabah',   icon: 'sunny-outline' },
  { key: 'ogle',    label: 'Öğle',    icon: 'sunny' },
  { key: 'ikindi',  label: 'İkindi',  icon: 'partly-sunny-outline' },
  { key: 'aksam',   label: 'Akşam',   icon: 'cloudy-night-outline' },
  { key: 'yatsi',   label: 'Yatsı',   icon: 'moon-outline' },
  { key: 'vitir',   label: 'Vitir',   icon: 'star-outline' },
];

/* ── Counter Row Component ─────────────────────── */
function CounterRow({ prayer, count, onIncrement, onDecrement }) {
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterLeft}>
        <View style={styles.counterIconWrap}>
          <Ionicons name={prayer.icon} size={18} color={colors.accent} />
        </View>
        <Text style={styles.counterLabel}>{prayer.label}</Text>
      </View>

      <View style={styles.counterControls}>
        <Pressable
          style={({ pressed }) => [styles.counterBtn, pressed && styles.counterBtnPressed]}
          onPress={onDecrement}
          disabled={count === 0}
        >
          <Ionicons name="remove" size={20} color={count > 0 ? colors.accent : colors.textMuted} />
        </Pressable>

        <View style={styles.countDisplay}>
          <Text style={[styles.countText, count === 0 && styles.countTextZero]}>
            {count}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.counterBtn, pressed && styles.counterBtnPressed]}
          onPress={onIncrement}
        >
          <Ionicons name="add" size={20} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

/* ── Main Screen ────────────────────────────────── */
export function KazaNamazScreen() {
  const navigation = useNavigation();
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Dialog state ── */
  const [dialog, setDialog] = useState({ visible: false, icon: null, title: '', message: '', buttons: [] });
  const showDialog = useCallback((icon, title, message, buttons) => {
    setDialog({ visible: true, icon, title, message, buttons: buttons || [{ text: 'Tamam' }] });
  }, []);
  const hideDialog = useCallback(() => setDialog((d) => ({ ...d, visible: false })), []);

  /* ── Entrance animations ── */
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;
  const fadeContent = useRef(new Animated.Value(0)).current;
  const slideContent = useRef(new Animated.Value(30)).current;
  const fadeSummary = useRef(new Animated.Value(0)).current;
  const slideSummary = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeHeader, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeContent, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideContent, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeSummary, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideSummary, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    const [c, t] = await Promise.all([getKazaCounts(), getTotalKaza()]);
    setCounts(c);
    setTotal(t);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  /* ── Handlers ── */
  const handleIncrement = useCallback(async (key) => {
    await incrementKaza(key);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDecrement = useCallback(async (key) => {
    await decrementKaza(key);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleReset = useCallback(() => {
    showDialog(
      'trash-outline',
      'Sıfırla',
      'Tüm kaza namazı sayaçlarını sıfırlamak istediğinize emin misiniz?',
      [
        { text: 'İptal' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            await resetAllKaza();
            setRefreshKey((k) => k + 1);
          },
        },
      ],
    );
  }, [showDialog]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[styles.headerRow, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>KAZA NAMAZI</Text>
              <Text style={styles.headerSubtitle}>Kılınmamış namaz takibi</Text>
            </View>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Info card */}
          <Animated.View style={[styles.infoCard, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
            <Ionicons name="information-circle" size={18} color={colors.accent} />
            <Text style={styles.infoText}>
              Kılmadığınız namazları + butonuyla ekleyin.{'\n'}
              Kaza olarak kıldıklarınızı - butonuyla düşün.
            </Text>
          </Animated.View>

          {/* Total summary */}
          <Animated.View style={[styles.totalCard, { opacity: fadeSummary, transform: [{ translateY: slideSummary }] }]}>
            <Text style={styles.totalLabel}>TOPLAM KAZA</Text>
            <Text style={[styles.totalCount, total === 0 && styles.totalCountZero]}>
              {total}
            </Text>
            <Text style={styles.totalSubtext}>
              {total === 0 ? 'Tebrikler! Kaza namazınız yok.' : 'vakit namaz borcunuz var'}
            </Text>
          </Animated.View>

          {/* Prayer counters */}
          <Animated.View style={{ opacity: fadeContent, transform: [{ translateY: slideContent }] }}>
            <Text style={styles.sectionTitle}>NAMAZ VAKİTLERİ</Text>
            {PRAYERS.map((prayer) => (
              <CounterRow
                key={prayer.key}
                prayer={prayer}
                count={counts[prayer.key] || 0}
                onIncrement={() => handleIncrement(prayer.key)}
                onDecrement={() => handleDecrement(prayer.key)}
              />
            ))}
          </Animated.View>

          {/* Reset button */}
          <Animated.View style={{ opacity: fadeSummary, transform: [{ translateY: slideSummary }] }}>
            <Pressable
              style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
              onPress={handleReset}
            >
              <Ionicons name="refresh" size={18} color={colors.textMuted} />
              <Text style={styles.resetText}>Tümünü Sıfırla</Text>
            </Pressable>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Dialog */}
        <CustomDialog
          visible={dialog.visible}
          icon={dialog.icon}
          title={dialog.title}
          message={dialog.message}
          buttons={dialog.buttons}
          onClose={hideDialog}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Styles ─────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  /* Info */
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  /* Total */
  totalCard: {
    backgroundColor: 'rgba(10, 46, 40, 0.95)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 161, 90, 0.20)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  totalCount: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  totalCountZero: {
    color: colors.textSecondary,
  },
  totalSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  /* Section */
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },

  /* Counter Row */
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
    padding: 14,
    marginBottom: 8,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnPressed: {
    opacity: 0.6,
  },
  countDisplay: {
    minWidth: 48,
    alignItems: 'center',
  },
  countText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  countTextZero: {
    color: colors.textMuted,
  },

  /* Reset */
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(200, 161, 90, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
  },
  resetText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
