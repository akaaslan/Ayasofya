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

import { ScreenBackground } from '../components/ScreenBackground';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import {
  getDayTracking,
  getMonthlyStats,
  getStreak,
  getWeeklyStats,
  setDayPrayer,
  togglePrayer,
  TRACKABLE_PRAYERS,
} from '../utils/prayerTracking';

/* ── Prayer display info ─────────────────────── */
const PRAYER_INFO = {
  imsak:  { icon: 'sunny-outline' },
  ogle:   { icon: 'sunny' },
  ikindi: { icon: 'partly-sunny-outline' },
  aksam:  { icon: 'cloudy-night-outline' },
  yatsi:  { icon: 'moon-outline' },
};

/* ── Animated checkbox row ── */
function PrayerRow({ prayerKey, checked, onToggle, isLast, t }) {
  const styles = createStyles();
  const info = PRAYER_INFO[prayerKey];
  const scale = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(checked ? 1 : 0.3)).current;
  const rowBg = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(checkOpacity, { toValue: checked ? 1 : 0, useNativeDriver: true, friction: 6 }),
      Animated.spring(checkScale, { toValue: checked ? 1 : 0.3, useNativeDriver: true, friction: 5 }),
      Animated.timing(rowBg, { toValue: checked ? 1 : 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, [checked]);

  const handlePress = useCallback(() => {
    // Bounce the entire row
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onToggle(prayerKey);
  }, [prayerKey, onToggle, scale]);

  const bgColor = rowBg.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(200, 161, 90, 0)', 'rgba(200, 161, 90, 0.06)'],
  });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={handlePress}>
        <Animated.View
          style={[
            styles.prayerRow,
            !isLast && styles.prayerRowBorder,
            { backgroundColor: bgColor },
            checked && { borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 12 },
          ]}
        >
          <View style={styles.prayerLeft}>
            <Ionicons
              name={info.icon}
              size={22}
              color={checked ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.prayerLabel, checked && styles.prayerLabelChecked]}>
              {t[prayerKey] || info.label}
            </Text>
          </View>
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }}>
              {checked && <Ionicons name="checkmark" size={16} color={colors.backgroundTop} />}
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/* ── Animated progress bar ── */
function AnimatedProgressBar({ progress }) {
  const styles = createStyles();
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: progress,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBarBg}>
      <Animated.View style={[styles.progressBarFill, { width }]} />
    </View>
  );
}

/* ── Animated weekly bar ── */
function WeekBar({ pct, isToday, dayLabel, dayNum }) {
  const styles = createStyles();
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: pct,
      duration: 600,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const height = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.weekDay}>
      <View style={styles.barWrap}>
        <Animated.View style={[styles.barFill, { height }]} />
      </View>
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{dayLabel}</Text>
      <Text style={styles.dayNum}>{dayNum}</Text>
    </View>
  );
}

/* ── Component ─────────────────────────────────── */
export function NamazTakipScreen() {
  const { fontScale } = useTheme();
  const { t, lang } = useI18n();
  const styles = createStyles(fontScale);
  const navigation = useNavigation();
  const [dayData, setDayData] = useState({});
  const [streak, setStreak] = useState(0);
  const [weekStats, setWeekStats] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthStats, setMonthStats] = useState(null);

  /* ── Entrance animations ── */
  const fadeHeader  = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;
  const fadeList    = useRef(new Animated.Value(0)).current;
  const slideList   = useRef(new Animated.Value(30)).current;
  const fadeStats   = useRef(new Animated.Value(0)).current;
  const slideStats  = useRef(new Animated.Value(40)).current;

  /* ── Streak number animation ── */
  const streakScale = useRef(new Animated.Value(1)).current;
  const prevStreakRef = useRef(streak);

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeHeader,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeList,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideList, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeStats,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideStats, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Bounce streak number when it changes
  useEffect(() => {
    if (prevStreakRef.current !== streak) {
      prevStreakRef.current = streak;
      Animated.sequence([
        Animated.timing(streakScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.spring(streakScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [streak]);

  /* ── Data loading ── */
  const loadData = useCallback(async () => {
    try {
      const [day, s, week, mStats] = await Promise.all([
        getDayTracking(selectedDate),
        getStreak(),
        getWeeklyStats(),
        getMonthlyStats(selectedDate.getFullYear(), selectedDate.getMonth()),
      ]);
      setDayData(day);
      setStreak(s);
      setWeekStats(week);
      setMonthStats(mStats);
    } catch (e) {
      console.warn('NamazTakip loadData error:', e);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  /* ── Toggle handler ── */
  const handleToggle = useCallback(async (prayerKey) => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (isToday) {
      await togglePrayer(prayerKey);
    } else {
      const newVal = !dayData[prayerKey];
      await setDayPrayer(prayerKey, newVal, selectedDate);
    }
    setRefreshKey((k) => k + 1);
  }, [selectedDate, dayData]);

  /* ── Date navigation ── */
  const goDay = useCallback((offset) => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + offset);
      if (nd > new Date()) return d; // don't go into future
      return nd;
    });
  }, []);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const localeDate = lang === 'tr' ? 'tr-TR' : 'en-US';

  const dateLabel = isToday
    ? (t.today)
    : selectedDate.toLocaleDateString(localeDate, { day: 'numeric', month: 'long', weekday: 'long' });

  /* ── Count today's completed ── */
  const todayCompleted = TRACKABLE_PRAYERS.filter((p) => dayData[p]).length;
  const todayProgress = todayCompleted / 5;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <Animated.View
            style={[
              styles.headerBlock,
              { opacity: fadeHeader, transform: [{ translateY: slideHeader }] },
            ]}
          >
            <View style={styles.headerRow}>
              <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color={colors.accent} />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.title}>{t.prayerTrackingTitle}</Text>
                <Text style={styles.subtitle}>{t.prayerTrackingDesc}</Text>
              </View>
              <View style={{ width: 32 }} />
            </View>
          </Animated.View>

          {/* ── Streak Card ── */}
          <Animated.View
            style={[
              styles.streakCard,
              { opacity: fadeHeader, transform: [{ translateY: slideHeader }] },
            ]}
          >
            <View style={styles.streakLeft}>
              <Ionicons name="flame" size={32} color={colors.accent} />
              <View style={styles.streakInfo}>
                <Animated.Text style={[styles.streakNum, { transform: [{ scale: streakScale }] }]}>
                  {streak}
                </Animated.Text>
                <Text style={styles.streakLabel}>{t.streakLabel}</Text>
              </View>
            </View>
            <View style={styles.streakRight}>
              <Text style={styles.todayProgress}>{todayCompleted}/5</Text>
              <Text style={styles.todayLabel}>{t.today}</Text>
            </View>
          </Animated.View>

          {/* ── Today's Progress Bar (animated) ── */}
          <Animated.View
            style={[
              styles.progressBarContainer,
              { opacity: fadeList, transform: [{ translateY: slideList }] },
            ]}
          >
            <AnimatedProgressBar progress={todayProgress} />
          </Animated.View>

          {/* ── Date Navigation ── */}
          <Animated.View
            style={[
              styles.dateNav,
              { opacity: fadeList, transform: [{ translateY: slideList }] },
            ]}
          >
            <Pressable onPress={() => goDay(-1)} style={styles.dateNavBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.accent} />
            </Pressable>
            <Pressable onPress={() => setSelectedDate(new Date())} style={styles.dateNavCenter}>
              <Text style={styles.dateNavLabel}>{dateLabel}</Text>
            </Pressable>
            <Pressable onPress={() => goDay(1)} style={[styles.dateNavBtn, isToday && { opacity: 0.3 }]} disabled={isToday}>
              <Ionicons name="chevron-forward" size={20} color={colors.accent} />
            </Pressable>
          </Animated.View>

          {/* ── Prayer Checklist (animated rows) ── */}
          <Animated.View
            style={[
              styles.listCard,
              { opacity: fadeList, transform: [{ translateY: slideList }] },
            ]}
          >
            <Text style={styles.listTitle}>{isToday ? (t.todaysPrayers) : dateLabel}</Text>
            {TRACKABLE_PRAYERS.map((key, idx) => (
              <PrayerRow
                key={key}
                prayerKey={key}
                checked={dayData[key] === true}
                onToggle={handleToggle}
                isLast={idx === TRACKABLE_PRAYERS.length - 1}
                t={t}
              />
            ))}
          </Animated.View>

          {/* ── Weekly Stats ── */}
          <Animated.View
            style={[
              styles.statsCard,
              { opacity: fadeStats, transform: [{ translateY: slideStats }] },
            ]}
          >
            <Text style={styles.listTitle}>{t.weekly}</Text>
            <View style={styles.weekRow}>
              {weekStats.map((day) => {
                const pct = day.total > 0 ? day.completed / day.total : 0;
                const now = new Date();
                const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isTodayWeek = day.dateKey === todayKey;
                const weekDayLabels = [t.sunShort, t.monShort, t.tueShort, t.wedShort, t.thuShort, t.friShort, t.satShort];
                return (
                  <WeekBar
                    key={day.dateKey}
                    pct={pct}
                    isToday={isTodayWeek}
                    dayLabel={weekDayLabels[day.date.getDay()]}
                    dayNum={day.dayNum}
                  />
                );
              })}
            </View>
            {/* ── Weekly total ── */}
            <View style={styles.weekTotal}>
              <Text style={styles.weekTotalLabel}>
                {t.weeklyTotal}
              </Text>
              <Text style={styles.weekTotalNum}>
                {weekStats.reduce((s, d) => s + d.completed, 0)} / {weekStats.length * 5}
              </Text>
            </View>
          </Animated.View>

          {/* ── Monthly Stats ── */}
          {monthStats && (
            <Animated.View
              style={[
                styles.statsCard,
                { opacity: fadeStats, transform: [{ translateY: slideStats }], marginTop: 16 },
              ]}
            >
              <Text style={styles.listTitle}>{t.monthly}</Text>
              <View style={styles.monthStatRow}>
                <View style={styles.monthStatItem}>
                  <Text style={styles.monthStatNum}>{monthStats.totalPrayed}</Text>
                  <Text style={styles.monthStatLabel}>{t.prayed}</Text>
                </View>
                <View style={styles.monthStatItem}>
                  <Text style={styles.monthStatNum}>{monthStats.totalPossible}</Text>
                  <Text style={styles.monthStatLabel}>{t.total}</Text>
                </View>
                <View style={styles.monthStatItem}>
                  <Text style={[styles.monthStatNum, { color: colors.accent }]}>%{monthStats.percentage}</Text>
                  <Text style={styles.monthStatLabel}>{t.success}</Text>
                </View>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Styles ─────────────────────────────────────── */
const createStyles = (fs = 1) => ({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },

  /* Header */
  headerBlock: { marginBottom: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26 * fs,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13 * fs,
    color: colors.textSecondary,
    marginTop: 4,
  },

  /* Streak */
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakInfo: {},
  streakNum: {
    fontSize: 28 * fs,
    fontWeight: '800',
    color: colors.accent,
    lineHeight: 32,
  },
  streakLabel: {
    fontSize: 12 * fs,
    color: colors.textSecondary,
    marginTop: -2,
  },
  streakRight: { alignItems: 'center' },
  todayProgress: {
    fontSize: 22 * fs,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Progress bar */
  progressBarContainer: { marginBottom: 16, paddingHorizontal: 2 },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.ringBase,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },

  /* List */
  listCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  listTitle: {
    fontSize: 15 * fs,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },

  /* Prayer row */
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  prayerRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prayerLabel: {
    fontSize: 16 * fs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  prayerLabelChecked: {
    color: colors.accent,
    textDecorationLine: 'line-through',
    textDecorationColor: colors.accentSoft,
  },

  /* Checkbox */
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  /* Stats */
  statsCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 12,
  },
  weekDay: { alignItems: 'center', flex: 1 },
  barWrap: {
    width: 20,
    height: 80,
    backgroundColor: colors.ringBase,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dayLabelToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayNum: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  weekTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: 12,
  },
  weekTotalLabel: {
    fontSize: 13 * fs,
    color: colors.textSecondary,
  },
  weekTotalNum: {
    fontSize: 16 * fs,
    fontWeight: '700',
    color: colors.accent,
  },

  /* Date navigation */
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  dateNavBtn: {
    padding: 6,
  },
  dateNavCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateNavLabel: {
    color: colors.textPrimary,
    fontSize: 14 * fs,
    fontWeight: '600',
  },

  /* Monthly stats */
  monthStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  monthStatItem: {
    alignItems: 'center',
  },
  monthStatNum: {
    fontSize: 24 * fs,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
