import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useI18n, LANGUAGE_LIST } from '../context/I18nContext';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@ayasofya_onboarding_done';

export async function isOnboardingDone() {
  const v = await AsyncStorage.getItem(ONBOARDING_KEY);
  return v === 'true';
}

async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

/* ── Onboarding Pages ──────────────────── */
const PAGES = [
  {
    icon: 'moon',
    titleKey: 'onboardingWelcome',
    descKey: 'onboardingWelcomeDesc',
    fallbackTitle: 'Hoş Geldiniz',
    fallbackDesc: 'Ayasofya ile namaz vakitlerini takip edin, kıble yönünü bulun ve zikir çekin.',
  },
  {
    icon: 'location',
    titleKey: 'onboardingLocation',
    descKey: 'onboardingLocationDesc',
    fallbackTitle: 'Konum İzni',
    fallbackDesc: 'Bulunduğunuz şehre göre doğru namaz vakitlerini hesaplayabilmemiz için konum izni gereklidir.',
  },
  {
    icon: 'notifications',
    titleKey: 'onboardingNotif',
    descKey: 'onboardingNotifDesc',
    fallbackTitle: 'Bildirimler',
    fallbackDesc: 'Her namaz vaktinde bildirim alarak hiçbir vakti kaçırmayın.',
  },
  {
    icon: 'color-palette',
    titleKey: 'onboardingReady',
    descKey: 'onboardingReadyDesc',
    fallbackTitle: 'Kişiselleştirin',
    fallbackDesc: 'Tema renklerini, dili ve diğer tercihleri ayarlardan istediğiniz gibi değiştirin.',
  },
];

export function OnboardingScreen({ onComplete }) {
  useTheme();
  const styles = createStyles();
  const { t, lang, changeLanguage } = useI18n();
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToPage = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentPage(index);
  };

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      goToPage(currentPage + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await markOnboardingDone();
    onComplete();
  };

  const onScroll = (e) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== currentPage) setCurrentPage(page);
  };

  const renderPage = ({ item }) => (
    <View style={styles.page}>
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={48} color={colors.accent} />
      </View>
      <Text style={styles.pageTitle}>
        {t[item.titleKey] || item.fallbackTitle}
      </Text>
      <Text style={styles.pageDesc}>
        {t[item.descKey] || item.fallbackDesc}
      </Text>
    </View>
  );

  const isLast = currentPage === PAGES.length - 1;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        {/* Language selector at top */}
        <View style={styles.langRow}>
          {LANGUAGE_LIST.map((l) => (
            <Pressable
              key={l.code}
              style={[styles.langPill, lang === l.code && styles.langPillActive]}
              onPress={() => changeLanguage(l.code)}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
            </Pressable>
          ))}
        </View>

        {/* Pages */}
        <FlatList
          ref={flatListRef}
          data={PAGES}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          extraData={lang}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentPage && styles.dotActive]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {currentPage > 0 && (
            <Pressable style={styles.skipBtn} onPress={() => goToPage(currentPage - 1)}>
              <Text style={styles.skipText}>← {t.back || 'Geri'}</Text>
            </Pressable>
          )}
          {currentPage === 0 && (
            <Pressable style={styles.skipBtn} onPress={handleFinish}>
              <Text style={styles.skipText}>{t.onboardingSkip || 'Atla'}</Text>
            </Pressable>
          )}
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>
              {isLast ? (t.onboardingStart || 'Başla') : (t.onboardingNext || 'İleri')}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Styles ─────────────────────────────── */
const createStyles = () => ({
  safe: { flex: 1 },

  /* Language row */
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  langPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillActive: {
    backgroundColor: 'rgba(200, 161, 90, 0.25)',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  langFlag: { fontSize: 18 },

  /* Page */
  page: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    flex: 1,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(200, 161, 90, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  pageDesc: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  /* Dots */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },

  /* Buttons */
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginLeft: 'auto',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
