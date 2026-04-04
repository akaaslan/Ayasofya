import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { getAllUpcomingHolidays, getNextHoliday } from '../utils/holidays';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

/* ── Bottom-sheet snap positions (translateY of the sheet top edge) ── */
const SHEET_H  = SCREEN_H;
const SNAP_90  = SCREEN_H * 0.10;          // 90 % visible
const SNAP_60  = SCREEN_H * 0.40;          // 60 % visible  (default)
const SNAP_30  = SCREEN_H * 0.70;          // 30 % visible
const SNAPS    = [SNAP_90, SNAP_60, SNAP_30];

/* ── Banner / circle constants ── */
const BANNER_W = SCREEN_W - 32;
const BANNER_H = 48;
const CIRCLE   = 46;

/* ── helpers ── */
function monthName(idx, t) {
  const def = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
               'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return t[`month_${idx + 1}`] || def[idx];
}
function fmtDate(d, t) { return `${d.getDate()} ${monthName(d.getMonth(), t)} ${d.getFullYear()}`; }
function nearestSnap(y) {
  return SNAPS.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
}

/**
 * Transparent banner above the tab bar showing countdown to the next religious holiday.
 * After 5 s it collapses into a small circle with a pulsing countdown icon.
 * Tapping the circle re-expands the banner; tapping the full banner opens a
 * draggable bottom-sheet with all upcoming holidays (snaps at 30 % / 60 % / 90 %).
 */
export function HolidayBanner({ visible, onClose }) {
  useTheme();
  const { t } = useI18n();
  const S = createStyles();

  const [holiday, setHoliday]       = useState(() => getNextHoliday());
  const [modalVisible, setModalVisible] = useState(false);
  const [allHolidays, setAllHolidays]   = useState([]);
  const [compact, setCompact]       = useState(false);

  /* ── animation refs ── */
  const bannerAnim = useRef(new Animated.Value(1)).current;   // 1 = full, 0 = circle
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseRef   = useRef(null);
  const compactTmr = useRef(null);

  const fadeAnim   = useRef(new Animated.Value(0)).current;   // modal overlay opacity
  const sheetY     = useRef(new Animated.Value(SCREEN_H)).current;
  const lastY      = useRef(SCREEN_H);

  /* ── 5-second auto-compact ── */
  const resetTimer = useCallback(() => {
    if (compactTmr.current) clearTimeout(compactTmr.current);
    compactTmr.current = setTimeout(() => {
      setCompact(true);
      Animated.timing(bannerAnim, {
        toValue: 0, duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 5000);
  }, [bannerAnim]);

  useEffect(() => {
    if (!visible) return;
    resetTimer();
    return () => { if (compactTmr.current) clearTimeout(compactTmr.current); };
  }, [visible, resetTimer]);

  /* ── pulse when compact ── */
  useEffect(() => {
    if (compact) {
      pulseRef.current = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseRef.current?.stop();
  }, [compact, pulseAnim]);

  /* ── refresh holiday every 60 s ── */
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setHoliday(getNextHoliday()), 60_000);
    return () => clearInterval(id);
  }, [visible]);

  /* ── modal open / close ── */
  const openModal = useCallback(() => {
    setAllHolidays(getAllUpcomingHolidays());
    setModalVisible(true);
    fadeAnim.setValue(0);
    sheetY.setValue(SCREEN_H);
    lastY.current = SNAP_60;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(sheetY,  { toValue: SNAP_60, damping: 24, stiffness: 220, useNativeDriver: false }),
    ]).start();
  }, [fadeAnim, sheetY]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetY,  { toValue: SCREEN_H, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start(() => setModalVisible(false));
  }, [fadeAnim, sheetY]);

  /* ── banner tap ── */
  const handleBannerPress = useCallback(() => {
    if (compact) {
      setCompact(false);
      Animated.timing(bannerAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      resetTimer();
    } else {
      openModal();
    }
  }, [compact, bannerAnim, resetTimer, openModal]);

  /* ── PanResponder for bottom-sheet header ── */
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
    onPanResponderGrant: () => {
      sheetY.setOffset(lastY.current);
      sheetY.setValue(0);
    },
    onPanResponderMove: Animated.event([null, { dy: sheetY }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      sheetY.flattenOffset();
      const cur = lastY.current + g.dy;
      const v = g.vy;
      let tgt;
      if (v > 1.5 || cur > SNAP_30 + 60)        tgt = null;
      else if (v >  0.5)                          tgt = SNAPS.find(s => s > lastY.current) ?? SNAP_30;
      else if (v < -0.5)                          tgt = [...SNAPS].reverse().find(s => s < lastY.current) ?? SNAP_90;
      else                                         tgt = nearestSnap(cur);
      if (tgt === null) { closeModal(); return; }
      lastY.current = tgt;
      Animated.spring(sheetY, { toValue: tgt, damping: 22, stiffness: 200, useNativeDriver: false }).start();
    },
  }), [sheetY, closeModal]);

  /* ── early exit ── */
  if (!visible || !holiday) return null;

  /* ── countdown string ── */
  const countdownStr = holiday.daysLeft > 0
    ? (t.daysHoursLeft || '{days} gün {hours} saat kaldı').replace('{days}', holiday.daysLeft).replace('{hours}', holiday.hoursLeft)
    : (t.hoursMinsLeft || '{hours} saat {mins} dk kaldı').replace('{hours}', holiday.hoursLeft).replace('{mins}', holiday.minutesLeft);

  /* ── banner interpolations ── */
  const bW  = bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [CIRCLE, BANNER_W] });
  const bH  = bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [CIRCLE, BANNER_H] });
  const bR  = bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [CIRCLE / 2, 14] });
  const cOp = bannerAnim.interpolate({ inputRange: [0, 0.25], outputRange: [1, 0], extrapolate: 'clamp' }); // circle icon
  const tOp = bannerAnim; // banner text opacity

  return (
    <>
      {/* ════════ BANNER / CIRCLE ════════ */}
      <Pressable
        onPress={handleBannerPress}
        style={({ pressed }) => [S.bannerTouch, pressed && { opacity: 0.8 }]}
      >
        <Animated.View style={[S.banner, { width: bW, height: bH, borderRadius: bR }]}>
          {/* full-banner content */}
          <Animated.View style={[S.content, { opacity: tOp }]} pointerEvents={compact ? 'none' : 'auto'}>
            <Ionicons name="star" size={14} color={colors.accent} />
            <View style={S.textWrap}>
              <Text style={S.name} numberOfLines={1}>{t[holiday.nameKey] || holiday.defaultName}</Text>
              <Text style={S.countdown}>{countdownStr}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            <Pressable
              style={({ pressed }) => [S.closeBtn, pressed && { opacity: 0.5 }]}
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </Animated.View>

          {/* circle icon (pulsing timer) */}
          <Animated.View style={[S.circleIcon, { opacity: cOp }]} pointerEvents="none">
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="timer-outline" size={22} color={colors.accent} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* ════════ BOTTOM-SHEET MODAL ════════ */}
      <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeModal}>
        <View style={S.modalRoot}>
          {/* dark overlay */}
          <Animated.View style={[S.overlay, { opacity: fadeAnim }]}>
            <Pressable style={{ flex: 1 }} onPress={closeModal} />
          </Animated.View>

          {/* sheet */}
          <Animated.View style={[S.sheet, { height: SHEET_H, transform: [{ translateY: sheetY }] }]}>
            {/* draggable header */}
            <View {...pan.panHandlers}>
              <View style={S.dragHandle} />
              <View style={S.modalHeader}>
                <Ionicons name="calendar" size={20} color={colors.accent} />
                <Text style={S.modalTitle}>{t.religiousDays || 'Dini Günler'}</Text>
                <Pressable
                  style={({ pressed }) => [S.modalCloseBtn, pressed && { opacity: 0.5 }]}
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* holiday list */}
            <ScrollView style={S.modalScroll} showsVerticalScrollIndicator={false} bounces={false}>
              {allHolidays.map((h, idx) => {
                const first = idx === 0;
                return (
                  <View key={`${h.nameKey}-${idx}`} style={[S.row, first && S.rowFirst]}>
                    <View style={[S.dot, first && S.dotActive]} />
                    <View style={S.info}>
                      <Text style={[S.hName, first && S.hNameActive]}>{t[h.nameKey] || h.defaultName}</Text>
                      <Text style={S.hDate}>{fmtDate(h.date, t)}</Text>
                    </View>
                    <View style={S.badge}>
                      <Text style={[S.hDays, first && S.hDaysActive]}>
                        {h.daysLeft > 0
                          ? (t.daysLeft || '{days} gün').replace('{days}', h.daysLeft)
                          : (t.todayBang || 'Bugün!')}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 24 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

/* ═══════════════════════  STYLES  ═══════════════════════ */
const createStyles = () => ({
  /* ── Banner ── */
  bannerTouch: {
    position: 'absolute',
    bottom: 82,
    right: 16,
    zIndex: 50,
  },
  banner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  content: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
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
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIcon: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Modal ── */
  modalRoot: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentSoft,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    backgroundColor: colors.ringBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flex: 1,
  },

  /* ── Holiday Row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  rowFirst: {
    backgroundColor: colors.activeRow,
    borderRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  dotActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accentGlow,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  info: { flex: 1 },
  hName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  hNameActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  hDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.ringBase,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hDays: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  hDaysActive: {
    color: colors.accent,
    fontWeight: '700',
  },
});
