import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getAllUpcomingHolidays, getNextHoliday } from '../utils/holidays';

/* ── Turkish month names ── */
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatDate(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCountdown(h) {
  if (h.daysLeft > 0) return `${h.daysLeft} gün ${h.hoursLeft} saat kaldı`;
  return `${h.hoursLeft} saat ${h.minutesLeft} dk kaldı`;
}

/**
 * Transparent banner above the tab bar showing countdown to the next religious holiday.
 * Tapping it opens a full list of upcoming holidays.
 */
export function HolidayBanner({ visible, onClose }) {
  useTheme();
  const styles = createStyles();
  const [holiday, setHoliday] = useState(() => getNextHoliday());
  const [modalVisible, setModalVisible] = useState(false);
  const [allHolidays, setAllHolidays] = useState([]);

  // Modal animation
  const modalFade = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(60)).current;

  // Refresh every 60 seconds
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setHoliday(getNextHoliday()), 60000);
    return () => clearInterval(id);
  }, [visible]);

  const openModal = useCallback(() => {
    setAllHolidays(getAllUpcomingHolidays());
    setModalVisible(true);
    modalFade.setValue(0);
    modalSlide.setValue(60);
    Animated.parallel([
      Animated.timing(modalFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(modalSlide, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [modalFade, modalSlide]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(modalSlide, { toValue: 60, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setModalVisible(false));
  }, [modalFade, modalSlide]);

  if (!visible || !holiday) return null;

  const countdownStr =
    holiday.daysLeft > 0
      ? `${holiday.daysLeft} gün ${holiday.hoursLeft} saat`
      : `${holiday.hoursLeft} saat ${holiday.minutesLeft} dk`;

  return (
    <>
      {/* ── Banner ── */}
      <Pressable
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
        onPress={openModal}
      >
        <View style={styles.content}>
          <Ionicons name="star" size={14} color={colors.accent} />
          <View style={styles.textWrap}>
            <Text style={styles.name} numberOfLines={1}>{holiday.name}</Text>
            <Text style={styles.countdown}>{countdownStr} kaldı</Text>
          </View>
        </View>
        <View style={styles.bannerRight}>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.5 }]}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>

      {/* ── Holiday List Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Animated.View
            style={[
              styles.modalCard,
              { opacity: modalFade, transform: [{ translateY: modalSlide }] },
            ]}
          >
            <View onStartShouldSetResponder={() => true}>
              {/* Drag handle */}
              <View style={styles.dragHandle} />
              {/* Header */}
              <View style={styles.modalHeader}>
                <Ionicons name="calendar" size={20} color={colors.accent} />
                <Text style={styles.modalTitle}>Dini Günler</Text>
                <Pressable
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.5 }]}
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Holiday list */}
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                bounces={false}
              >
                {allHolidays.map((h, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <View
                      key={`${h.name}-${idx}`}
                      style={[styles.holidayRow, isFirst && styles.holidayRowFirst]}
                    >
                      <View style={[styles.holidayDot, isFirst && styles.holidayDotActive]} />
                      <View style={styles.holidayInfo}>
                        <Text style={[styles.holidayName, isFirst && styles.holidayNameActive]}>
                          {h.name}
                        </Text>
                        <Text style={styles.holidayDate}>{formatDate(h.date)}</Text>
                      </View>
                      <View style={styles.holidayBadge}>
                        <Text style={[styles.holidayDays, isFirst && styles.holidayDaysActive]}>
                          {h.daysLeft > 0 ? `${h.daysLeft} gün` : 'Bugün!'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: 16 }} />
              </ScrollView>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = () => ({
  /* ── Banner ── */
  banner: {
    position: 'absolute',
    bottom: 82,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8, 30, 26, 0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.18)',
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  bannerPressed: { opacity: 0.8 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  textWrap: { flex: 1 },
  name: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  countdown: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Modal Overlay ── */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },

  /* ── Modal Card ── */
  modalCard: {
    backgroundColor: '#0a2e28',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.15)',
    borderBottomWidth: 0,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(200, 161, 90, 0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 161, 90, 0.10)',
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  /* ── Holiday Row ── */
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(200, 161, 90, 0.08)',
    gap: 12,
  },
  holidayRowFirst: {
    backgroundColor: 'rgba(200, 161, 90, 0.06)',
    borderRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  holidayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  holidayDotActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accentGlow,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  holidayNameActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  holidayDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  holidayBadge: {
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  holidayDays: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  holidayDaysActive: {
    color: colors.accent,
    fontWeight: '700',
  },
});
