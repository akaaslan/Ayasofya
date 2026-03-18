import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarModal } from '../components/CalendarModal';
import { CountdownRing } from '../components/CountdownRing';
import { CustomDialog } from '../components/CustomDialog';
import { HeaderSection } from '../components/HeaderSection';
import { ScreenBackground } from '../components/ScreenBackground';
import { useLocationContext } from '../context/LocationContext';
import { useRamadan } from '../context/RamadanContext';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { getHijriDisplayString } from '../utils/hijriDate';
import { getRamadanInfo } from '../utils/ramadanMode';
import { colors } from '../theme/colors';

/** Turkish dative-case forms */
const DATIVE = {
  imsak:  'İmsaka',
  gunes:  'Güneşe',
  ogle:   'Öğleye',
  ikindi: 'İkindiye',
  aksam:  'Akşama',
  yatsi:  'Yatsıya',
};

/** Icons for each prayer */
const PRAYER_ICONS = {
  imsak: 'moon-outline',
  gunes: 'sunny-outline',
  ogle: 'sunny',
  ikindi: 'partly-sunny-outline',
  aksam: 'cloudy-night-outline',
  yatsi: 'moon',
};

/* ── Günün Ayeti ── */
const DAILY_VERSES = [
  { verse: '"Şüphesiz Allah, adaleti, iyiliği, yakınlara yardım etmeyi emreder..."', source: 'Nahl, 90' },
  { verse: '"Şüphesiz her güçlükle bir kolaylık vardır."', source: 'İnşirah, 94:6' },
  { verse: '"Allah sabredenleri sever."', source: 'Âl-i İmrân, 3:146' },
  { verse: '"Rabbinizden mağfiret dileyin; O çok bağışlayıcıdır."', source: 'Nûh, 71:10' },
  { verse: '"Kim Allah\'a güvenirse O, ona yeter."', source: 'Talâk, 65:3' },
  { verse: '"Namaz müminler üzerine vakitli bir farzdır."', source: 'Nisâ, 4:103' },
  { verse: '"Biz insanı en güzel biçimde yarattık."', source: 'Tîn, 95:4' },
];

function getDayIndex(count) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return dayOfYear % count;
}

export function HomeScreen() {
  const navigation = useNavigation();
  const { lat, lng, tz, city, district } = useLocationContext();
  const clock = useCurrentTime();
  const prayerData = usePrayerTimes(lat, lng, tz);
  const prayers = prayerData?.prayers ?? [];
  const nextPrayer = prayerData?.nextPrayer ?? null;
  const activeIndex = prayerData?.activeIndex ?? -1;
  const countdown = prayerData?.countdown ?? '00:00:00';
  const progress = prayerData?.progress ?? 0;
  const currentTime = prayerData?.currentTime ?? new Date();
  const prayerSource = prayerData?.prayerSource ?? 'local';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  /* ── Dialog state ── */
  const [dialog, setDialog] = useState({ visible: false, icon: null, title: '', message: '', buttons: [] });
  const showDialog = useCallback((icon, title, message, buttons) => {
    setDialog({ visible: true, icon, title, message, buttons: buttons || [{ text: 'Tamam' }] });
  }, []);
  const hideDialog = useCallback(() => setDialog((d) => ({ ...d, visible: false })), []);

  /* ── Calendar state ── */
  const [calendarVisible, setCalendarVisible] = useState(false);

  const hijriDay = useMemo(() => getHijriDisplayString(new Date()), []);

  /* ── Ramadan detection (from context) ── */
  const { ramadan } = useRamadan();
  const tomorrowPrayers = prayerData?.tomorrowPrayers ?? [];
  const ramadanInfo = useMemo(() => {
    if (!ramadan.isRamadan || prayers.length === 0) return null;
    return getRamadanInfo(prayers, tomorrowPrayers, currentTime);
  }, [ramadan.isRamadan, prayers, tomorrowPrayers, currentTime]);

  /* ── Location display name ── */
  const locationDisplay = useMemo(() => {
    if (district) return `${district}, ${city}`;
    return city;
  }, [city, district]);

  const nextPrayerName = nextPrayer?.label ?? '—';
  const nextPrayerTime = nextPrayer?.time ?? '';



  const toggleDropdown = useCallback(() => {
    const opening = !dropdownOpen;
    setDropdownOpen(opening);
    Animated.timing(dropdownAnim, {
      toValue: opening ? 1 : 0,
      duration: 320,
      easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [dropdownOpen, dropdownAnim]);

  const handleDua = useCallback(() => {
    navigation.navigate('DuaCollection');
  }, [navigation]);

  const handleEsma = useCallback(() => {
    navigation.navigate('Esma');
  }, [navigation]);

  const handleVerse = useCallback(() => {
    const idx = getDayIndex(7);
    const v = DAILY_VERSES[idx];
    showDialog('book', 'Bugünün Ayeti', `${v.verse}\n\n— ${v.source}`, [{ text: 'Tamam' }]);
  }, [showDialog]);

  const handleMosque = useCallback(() => {
    const url = `https://www.google.com/maps/search/cami+mosque/@${lat},${lng},14z`;
    Linking.openURL(url).catch(() => {
      showDialog('business', 'Hata', 'Harita uygulaması açılamadı.', [{ text: 'Tamam' }]);
    });
  }, [lat, lng, showDialog]);

  /* ── Entrance animations ── */
  const fadeRing  = useRef(new Animated.Value(0)).current;
  const slideRing = useRef(new Animated.Value(30)).current;
  const fadeBtn   = useRef(new Animated.Value(0)).current;
  const slideBtn  = useRef(new Animated.Value(20)).current;
  const fadeGrid  = useRef(new Animated.Value(0)).current;
  const slideGrid = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const stagger = [
      Animated.parallel([
        Animated.timing(fadeRing, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideRing, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeBtn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideBtn, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeGrid, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideGrid, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ];
    Animated.stagger(150, stagger).start();
  }, []);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <HeaderSection
              title="BUGÜNÜN VAKİTLERİ"
              dayName={hijriDay}
            />

            {/* ── Countdown Ring with progress ── */}
            <Animated.View style={{ opacity: fadeRing, transform: [{ translateY: slideRing }] }}>
              <CountdownRing
                label="SONRAKİ VAKİT"
                prayerName={nextPrayerName}
                countdown={countdown}
                caption="KALAN SÜRE"
                progress={progress}
              />
            </Animated.View>

            {/* ── Ezan Saatleri Dropdown ── */}
            <Animated.View style={{ opacity: fadeBtn, transform: [{ translateY: slideBtn }] }}>
              <Pressable
                style={({ pressed }) => [styles.dropdownBtn, pressed && styles.dropdownBtnPressed]}
                onPress={toggleDropdown}
              >
                <Ionicons name="time-outline" size={22} color={colors.accent} />
                <Text style={styles.dropdownBtnText}>Ezan Saatleri</Text>
                {nextPrayer && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>{nextPrayer.label} · {nextPrayer.time}</Text>
                  </View>
                )}
                <Ionicons
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </Animated.View>

            {/* Animated dropdown list */}
            <Animated.View
              style={[
                styles.dropdownList,
                {
                  maxHeight: dropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 340],
                  }),
                  opacity: dropdownAnim.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0, 0.5, 1],
                  }),
                  marginTop: dropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 6],
                  }),
                  marginBottom: dropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 4],
                  }),
                  borderWidth: dropdownAnim.interpolate({
                    inputRange: [0, 0.01, 1],
                    outputRange: [0, 1, 1],
                  }),
                },
              ]}
              pointerEvents={dropdownOpen ? 'auto' : 'none'}
            >
              {prayers.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                  <View key={item.key} style={[styles.dropdownRow, isActive && styles.dropdownRowActive]}>
                    <View style={styles.dropdownRowLeft}>
                      <Ionicons
                        name={PRAYER_ICONS[item.key] ?? 'ellipse-outline'}
                        size={16}
                        color={isActive ? colors.accent : colors.textMuted}
                      />
                      <Text style={[styles.dropdownLabel, isActive && styles.dropdownLabelActive]}>
                        {item.label}
                      </Text>
                    </View>
                    <Text style={[styles.dropdownTime, isActive && styles.dropdownTimeActive]}>
                      {item.time}
                    </Text>
                  </View>
                );
              })}
            </Animated.View>

            {/* ═══════════════════════════════════════════
                ██  FEATURE CARDS — screenshot layout  ██
                ═══════════════════════════════════════════ */}
            <Animated.View style={{ opacity: fadeGrid, transform: [{ translateY: slideGrid }] }}>

            {/* ── Ramadan Banner (conditional) ── */}
            {ramadan.isRamadan && ramadanInfo && (
              <View style={styles.ramadanBanner}>
                <View style={styles.ramadanHeader}>
                  <Text style={styles.ramadanIcon}>☪</Text>
                  <Text style={styles.ramadanTitle}>Ramazan-ı Şerif</Text>
                  <Text style={styles.ramadanDay}>{ramadan.dayOfRamadan}. gün</Text>
                </View>
                <View style={styles.ramadanCounters}>
                  {ramadanInfo.isBeforeIftar && !ramadanInfo.isBeforeSahur && (
                    <View style={styles.ramadanCounter}>
                      <Text style={styles.ramadanCounterLabel}>İftara Kalan</Text>
                      <Text style={styles.ramadanCounterValue}>{ramadanInfo.iftarCountdown}</Text>
                      <Text style={styles.ramadanCounterTime}>{ramadanInfo.iftarTime}</Text>
                    </View>
                  )}
                  {ramadanInfo.isBeforeSahur && (
                    <View style={styles.ramadanCounter}>
                      <Text style={styles.ramadanCounterLabel}>Sahura Kalan</Text>
                      <Text style={styles.ramadanCounterValue}>{ramadanInfo.sahurCountdown}</Text>
                      <Text style={styles.ramadanCounterTime}>{ramadanInfo.sahurTime}</Text>
                    </View>
                  )}
                  {!ramadanInfo.isBeforeIftar && !ramadanInfo.isBeforeSahur && (
                    <View style={styles.ramadanCounter}>
                      <Text style={styles.ramadanCounterLabel}>İftar Yapıldı</Text>
                      <Text style={styles.ramadanCounterValue}>🤲</Text>
                      <Text style={styles.ramadanCounterTime}>Hayırlı iftarlar</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ── Location display ── */}
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={colors.accent} />
              <Text style={styles.locationText}>{locationDisplay}</Text>
              {prayerSource !== 'local' && (
                <View style={styles.apiBadge}>
                  <Text style={styles.apiBadgeText}>API</Text>
                </View>
              )}
            </View>

            {/* Row 1: Namaz Takip & Kur'an — primary action cards */}
            <View style={styles.cardRow}>
              {/* Namaz Takip card */}
              <Pressable
                style={({ pressed }) => [styles.imageCard, pressed && styles.imageCardPressed]}
                onPress={() => navigation.navigate('NamazTakip')}
              >
                <View style={[styles.imageCardInner, { backgroundColor: 'rgba(10, 46, 40, 0.95)' }]}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="checkmark-circle" size={36} color={colors.accent} />
                  </View>
                  <Text style={styles.imageCardLabel}>Namaz{"\n"}Takip</Text>
                </View>
              </Pressable>

              {/* Kur'an Oku card */}
              <Pressable
                style={({ pressed }) => [styles.imageCard, pressed && styles.imageCardPressed]}
                onPress={() => navigation.navigate('Quran')}
              >
                <View style={[styles.imageCardInner, { backgroundColor: 'rgba(10, 46, 40, 0.95)' }]}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="book" size={36} color={colors.accent} />
                  </View>
                  <Text style={styles.imageCardLabel}>Kur'an{"\n"}Oku</Text>
                </View>
              </Pressable>
            </View>

            {/* Row 2: Dua Koleksiyonu & Esma-ül Hüsna & Kaza Namazı */}
            <View style={styles.cardRow}>
              {/* Dua Koleksiyonu card */}
              <Pressable
                style={({ pressed }) => [styles.imageCardSmall, pressed && styles.imageCardPressed]}
                onPress={handleDua}
              >
                <View style={[styles.imageCardSmallInner, { backgroundColor: 'rgba(10, 46, 40, 0.95)' }]}>
                  <Ionicons name="hand-left" size={24} color={colors.accent} />
                  <Text style={styles.imageCardSmallLabel}>Dualar</Text>
                </View>
              </Pressable>

              {/* Esma-ül Hüsna card */}
              <Pressable
                style={({ pressed }) => [styles.imageCardSmall, pressed && styles.imageCardPressed]}
                onPress={handleEsma}
              >
                <View style={[styles.imageCardSmallInner, { backgroundColor: 'rgba(10, 46, 40, 0.95)' }]}>
                  <Ionicons name="sparkles" size={24} color={colors.accent} />
                  <Text style={styles.imageCardSmallLabel}>Esma-ül{'\n'}Hüsna</Text>
                </View>
              </Pressable>

              {/* Kaza Namazı card */}
              <Pressable
                style={({ pressed }) => [styles.imageCardSmall, pressed && styles.imageCardPressed]}
                onPress={() => navigation.navigate('KazaNamaz')}
              >
                <View style={[styles.imageCardSmallInner, { backgroundColor: 'rgba(10, 46, 40, 0.95)' }]}>
                  <Ionicons name="time" size={24} color={colors.accent} />
                  <Text style={styles.imageCardSmallLabel}>Kaza{'\n'}Namazı</Text>
                </View>
              </Pressable>
            </View>

            {/* Row 3: Günün Ayeti & Yakındaki Camiler */}
            <Pressable
              style={({ pressed }) => [styles.mosqueRow, pressed && styles.mosqueRowPressed]}
              onPress={handleVerse}
            >
              <View style={styles.mosqueIcon}>
                <Ionicons name="bookmarks" size={22} color={colors.accent} />
              </View>
              <View style={styles.mosqueText}>
                <Text style={styles.mosqueTitle}>Günün Ayeti</Text>
                <Text style={styles.mosqueSubtitle}>Her gün yeni bir ayet, yeni bir ilham.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.mosqueRow, pressed && styles.mosqueRowPressed]}
              onPress={handleMosque}
            >
              <View style={styles.mosqueIcon}>
                <Ionicons name="business" size={22} color={colors.accent} />
              </View>
              <View style={styles.mosqueText}>
                <Text style={styles.mosqueTitle}>Yakındaki Camiler</Text>
                <Text style={styles.mosqueSubtitle}>Konumunuza en yakın ibadethaneleri bulun.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            </Animated.View>

            {/* Spacer for tab bar */}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>

        {/* ── Custom Dialog (replaces Alert.alert) ── */}
        <CustomDialog
          visible={dialog.visible}
          icon={dialog.icon}
          title={dialog.title}
          message={dialog.message}
          buttons={dialog.buttons}
          onClose={hideDialog}
        />

        {/* ── Calendar Modal ── */}
        <CalendarModal
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          lat={lat}
          lng={lng}
          tz={tz}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 8,
  },

  /* Dropdown */
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 38, 34, 0.90)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 161, 90, 0.25)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 6,
  },
  dropdownBtnPressed: { opacity: 0.7 },
  dropdownBtnText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextBadge: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 4,
  },
  nextBadgeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  dropdownList: {
    backgroundColor: 'rgba(10, 38, 34, 0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
    marginTop: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(133, 158, 116, 0.08)',
  },
  dropdownRowActive: { backgroundColor: colors.activeRow },
  dropdownRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownLabelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  dropdownTime: {
    color: colors.textMuted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  dropdownTimeActive: {
    color: colors.accent,
    fontWeight: '700',
  },

  /* ── Image Cards Row ── */
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  },

  /* ── Ramadan Banner ── */
  ramadanBanner: {
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 161, 90, 0.30)',
    padding: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  ramadanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ramadanIcon: {
    fontSize: 18,
    color: colors.accent,
  },
  ramadanTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  ramadanDay: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  ramadanCounters: {
    flexDirection: 'row',
    gap: 12,
  },
  ramadanCounter: {
    flex: 1,
    backgroundColor: 'rgba(10, 46, 40, 0.60)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  ramadanCounterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ramadanCounterValue: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  ramadanCounterTime: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  /* ── Location Row ── */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  apiBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  apiBadgeText: {
    color: '#4CAF50',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  imageCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  imageCardPressed: { opacity: 0.8 },
  imageCardInner: {
    height: 140,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.12)',
    padding: 16,
    justifyContent: 'flex-end',
    gap: 10,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCardLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },

  /* ── Small Cards Row ── */
  imageCardSmall: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageCardSmallInner: {
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imageCardSmallLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* ── Mosque Row ── */
  mosqueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 46, 40, 0.95)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.12)',
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  mosqueRowPressed: { opacity: 0.8 },
  mosqueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mosqueText: {
    flex: 1,
  },
  mosqueTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  mosqueSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
