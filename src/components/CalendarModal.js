import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { gregorianToHijri } from '../utils/hijriDate';
import { getPrayerTimes } from '../utils/prayerApi';
import { calculatePrayerTimes } from '../utils/prayerCalculation';

/* ── Turkish day / month names ── */
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/* ── Helpers ── */
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // Monday = 0, Sunday = 6
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

/**
 * Custom calendar modal showing monthly view with Hijri dates,
 * prayer times for selected day + month navigation.
 *
 * Props:
 *   visible     – boolean
 *   onClose     – dismiss callback
 *   lat, lng, tz – for prayer time calculation
 */
export function CalendarModal({ visible, onClose, lat, lng, tz }) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      setSelectedDate(today);
      fade.setValue(0);
      slide.setValue(80);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const closeAnimated = useCallback(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 80, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose?.());
  }, [fade, slide, onClose]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  /* ── Selected day data ── */
  const selectedHijri = useMemo(() => gregorianToHijri(selectedDate), [selectedDate]);
  const [selectedPrayers, setSelectedPrayers] = useState(() =>
    calculatePrayerTimes(selectedDate, lat, lng, tz),
  );
  const [prayerLoading, setPrayerLoading] = useState(false);

  // Fetch API prayer times when selected date changes
  useEffect(() => {
    let cancelled = false;
    setPrayerLoading(true);
    // Instant: show local calculation while API loads
    setSelectedPrayers(calculatePrayerTimes(selectedDate, lat, lng, tz));
    getPrayerTimes(selectedDate, lat, lng, tz).then(({ prayers }) => {
      if (!cancelled) {
        setSelectedPrayers(prayers);
        setPrayerLoading(false);
      }
    }).catch(() => { if (!cancelled) setPrayerLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, lat, lng, tz]);

  /* ── Build calendar grid ── */
  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const rows = [];
    let week = new Array(firstDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) {
        rows.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      rows.push(week);
    }
    return rows;
  }, [viewYear, viewMonth]);

  const handleDayPress = useCallback((day) => {
    if (!day) return;
    setSelectedDate(new Date(viewYear, viewMonth, day));
  }, [viewYear, viewMonth]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeAnimated}
    >
      <Pressable style={styles.overlay} onPress={closeAnimated}>
        <Animated.View
          style={[styles.card, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Pressable>{/* prevent close on card tap */}

            {/* ── Header: month nav ── */}
            <View style={styles.header}>
              <Pressable
                style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
                onPress={prevMonth}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent} />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.monthText}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
                onPress={nextMonth}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.5 }]}
                onPress={closeAnimated}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* ── Day name row ── */}
            <View style={styles.dayNameRow}>
              {DAY_NAMES.map((n) => (
                <Text key={n} style={styles.dayNameText}>{n}</Text>
              ))}
            </View>

            {/* ── Calendar grid ── */}
            <View style={styles.gridWrap}>
              {calendarGrid.map((week, wIdx) => (
                <View key={wIdx} style={styles.weekRow}>
                  {week.map((day, dIdx) => {
                    if (!day) return <View key={dIdx} style={styles.dayCell} />;
                    const cellDate = new Date(viewYear, viewMonth, day);
                    const isToday = isSameDay(cellDate, today);
                    const isSelected = isSameDay(cellDate, selectedDate);
                    const hijri = gregorianToHijri(cellDate);
                    return (
                      <Pressable
                        key={dIdx}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isToday && !isSelected && styles.dayCellToday,
                        ]}
                        onPress={() => handleDayPress(day)}
                      >
                        <Text style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                          isToday && !isSelected && styles.dayTextToday,
                        ]}>
                          {day}
                        </Text>
                        <Text style={[
                          styles.hijriDayText,
                          isSelected && styles.hijriDayTextSelected,
                        ]}>
                          {hijri.day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* ── Selected day detail ── */}
            <View style={styles.detailSection}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailDate}>
                  {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]}
                </Text>
                <Text style={styles.detailHijri}>
                  {selectedHijri.day} {selectedHijri.monthName} {selectedHijri.year}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.prayerChips}
              >
                {selectedPrayers.map((p) => (
                  <View key={p.key} style={[styles.prayerChip, prayerLoading && { opacity: 0.6 }]}>
                    <Text style={styles.prayerChipLabel}>{p.label}</Text>
                    <Text style={styles.prayerChipTime}>{p.time}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0a2e28',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.15)',
    paddingBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
  },
  navBtnPressed: { opacity: 0.5 },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  /* Day names row */
  dayNameRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  dayNameText: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Grid */
  gridWrap: {
    paddingHorizontal: 8,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
    minHeight: 44,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(200, 161, 90, 0.20)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dayCellToday: {
    backgroundColor: 'rgba(200, 161, 90, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.20)',
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayTextToday: {
    color: colors.accent,
  },
  hijriDayText: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  hijriDayTextSelected: {
    color: colors.accentSoft,
  },

  /* Detail section */
  detailSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 161, 90, 0.10)',
    paddingHorizontal: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailDate: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  detailHijri: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  prayerChips: {
    gap: 8,
    paddingBottom: 4,
  },
  prayerChip: {
    backgroundColor: 'rgba(10, 46, 40, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.10)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 64,
  },
  prayerChipLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  prayerChipTime: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
