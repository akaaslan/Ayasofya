import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { colors } from '../theme/colors';
import { getBookmark, setBookmark } from '../utils/quranBookmark';
import { getSurahs, getSurahContent } from '../utils/quranApi';

/* ── Component ─────────────────────────────────── */
export function QuranScreen() {
  useTheme();
  const { t } = useI18n();
  const styles = createStyles();
  const navigation = useNavigation();
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [surahs, setSurahs] = useState([]);

  /* ── Load data ── */
  useEffect(() => {
    getSurahs().then(setSurahs);
  }, []);

  /* ── Load bookmark ── */
  useFocusEffect(
    useCallback(() => {
      getBookmark().then((b) => setBookmarkId(b?.surahId ?? null));
    }, [])
  );

  const handleSelectSurah = async (item) => {
    // 1. Fetch full content if it is missing (list view only has name/id)
    const fullContent = await getSurahContent(item.id);
    const surahToDisplay = { ...item, ...fullContent };
    
    setBookmark(item.id, item.name);
    setBookmarkId(item.id);
    setSelectedSurah(surahToDisplay);
  };

  /* ── Entrance animations ── */
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;
  const fadeList = useRef(new Animated.Value(0)).current;
  const slideList = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeHeader, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeList, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideList, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  /* ── Reading View ── */
  if (selectedSurah) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          <SurahReader
            surah={selectedSurah}
            onBack={() => setSelectedSurah(null)}
            isBookmarked={bookmarkId === selectedSurah.id}
            onBookmark={() => {
              setBookmark(selectedSurah.id, selectedSurah.name);
              setBookmarkId(selectedSurah.id);
            }}
            t={t}
          />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  /* ── Surah List ── */
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        {/* header */}
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
              <Text style={styles.title}>{t.quranTitle}</Text>
              <Text style={styles.subtitle}>{t.quranSubtitle}</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>
        </Animated.View>

        {/* bookmark resume banner */}
        {bookmarkId && (
          <Animated.View
            style={[
              styles.bookmarkBanner,
              { opacity: fadeHeader, transform: [{ translateY: slideHeader }] },
            ]}
          >
            <Pressable
              style={styles.bookmarkBtn}
              onPress={() => {
                const s = surahs.find((x) => x.id === bookmarkId);
                if (s) handleSelectSurah(s);
              }}
            >
              <Ionicons name="bookmark" size={18} color={colors.accent} />
              <Text style={styles.bookmarkText}>
                {t.continueReading} – {surahs.find((x) => x.id === bookmarkId)?.name}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
          </Animated.View>
        )}

        {/* list */}
        <Animated.View
          style={[
            styles.listWrap,
            { opacity: fadeList, transform: [{ translateY: slideList }] },
          ]}
        >
          <FlatList
            data={surahs}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.surahRow,
                  pressed && styles.surahRowPressed,
                  index < surahs.length - 1 && styles.surahRowBorder,
                  bookmarkId === item.id && styles.surahRowBookmarked,
                ]}
                onPress={() => handleSelectSurah(item)}
              >
                <View style={styles.surahNumBadge}>
                  <Text style={styles.surahNum}>{item.id}</Text>
                </View>
                <View style={styles.surahInfo}>
                  <Text style={styles.surahName}>{item.name}</Text>
                  <Text style={styles.surahAyah}>{item.ayahCount} {t.ayahCountLabel || 'ayet'}</Text>
                </View>
                <Text style={styles.surahArabic}>{item.arabic}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          />
        </Animated.View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Surah Reading Sub-component ──────────────── */
function SurahReader({ surah, onBack, isBookmarked, onBookmark, t }) {
  const styles = createStyles();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.readerWrap,
        { opacity: fadeIn, transform: [{ translateY: slideIn }] },
      ]}
    >
      {/* back button + title */}
      <View style={styles.readerHeader}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={styles.backText}>{t.back}</Text>
        </Pressable>
        <View style={styles.readerTitleWrap}>
          <Text style={styles.readerTitle}>{surah.name}</Text>
          <Text style={styles.readerAyah}>{surah.ayahCount} {t.ayahCountLabel}</Text>
        </View>
        <View style={styles.readerActions}>
          <Pressable onPress={onBookmark} style={styles.actionBtn}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={colors.accent}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.readerScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Detailed ayas list or single block? */}
        {surah.ayas ? (
          surah.ayas.map((a, i) => (
            <View key={i} style={styles.ayaBlock}>
              <View style={styles.ayaHeader}>
                <View style={styles.ayaCircle}>
                  <Text style={styles.ayaNum}>{a.aya_number}</Text>
                </View>
                <View style={styles.ayaLine} />
              </View>
              <Text style={styles.arabicText}>{a.text}</Text>
              {/* Optional: if there's meaning associated with each individual aya, display it here */}
            </View>
          ))
        ) : (
          /* Backward compatibility for local fallback data */
          <View style={styles.arabicCard}>
            <Text style={styles.arabicText}>{surah.text}</Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>{t.meaning}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Turkish meaning */}
        <View style={styles.meaningCard}>
          <Text style={styles.meaningText}>{surah.meaning}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

/* ── Styles ─────────────────────────────────────── */
const createStyles = () => ({
  safe: { flex: 1 },

  /* Header */
  headerBlock: { paddingTop: 18, paddingBottom: 10, paddingHorizontal: 14 },
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
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },

  /* List */
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },

  /* Surah row */
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  surahRowPressed: {
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    borderRadius: 10,
  },
  surahRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  surahNumBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.ringBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  surahInfo: { flex: 1 },
  surahName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  surahAyah: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  surahArabic: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '500',
    marginRight: 6,
  },

  /* Reader */
  readerWrap: { flex: 1 },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 60 },
  backText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '500',
    marginLeft: 2,
  },
  readerTitleWrap: { alignItems: 'center' },
  readerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  readerAyah: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Reader scroll */
  readerScroll: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 40 },

  /* Arabic card */
  arabicCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  arabicText: {
    fontSize: 26,
    lineHeight: 48,
    color: colors.textPrimary,
    textAlign: 'right',
    fontWeight: '400',
    writingDirection: 'rtl',
    marginBottom: 10,
  },

  /* Aya Block */
  ayaBlock: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 16,
  },
  ayaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  ayaCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 161, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.3)',
  },
  ayaNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  ayaLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(200, 161, 90, 0.1)',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  dividerLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 12,
    fontWeight: '600',
  },

  /* Meaning card */
  meaningCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  meaningText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
  },

  /* Bookmark banner */
  bookmarkBanner: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 161, 90, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  bookmarkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },

  /* Surah row bookmark highlight */
  surahRowBookmarked: {
    backgroundColor: 'rgba(200, 161, 90, 0.06)',
    borderRadius: 10,
  },

  /* Reader action buttons */
  readerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
