/**
 * QuranScreen.jsx  –  production-ready
 *
 * New in this version
 * ───────────────────
 * 1. Gapless playback   – via AudioContext (preloader keeps next aya buffered)
 * 2. Auto-scroll        – playing aya always scrolled into view via FlatList.scrollToIndex
 * 3. Background audio   – AudioProvider lives at the root, so audio survives
 *                         navigation away from this screen
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  useMemo,
} from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackground } from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { useAudio } from '../context/AudioContext';
import { colors } from '../theme/colors';
import { getBookmark, setBookmark } from '../utils/quranBookmark';
import { getSurahs, getSurahContent, getReciters, getTafsirs } from '../utils/quranApi';
import { getLanguage } from '../utils/languageMapper';

/* ─────────────────────────────────────────────────────────────────────────────
   LAYOUT CONSTANTS  (used for getItemLayout + scrollToIndex fallback)
   ───────────────────────────────────────────────────────────────────────────── */
const AYA_CARD_ESTIMATED_HEIGHT = 280;
const TITLE_CARD_HEIGHT         = 240;
const SURAH_ROW_HEIGHT          = 60;

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
export function QuranScreen({ route }) {
  const { fontScale } = useTheme();
  const { t, lang }   = useI18n();
  const styles        = useMemo(() => createStyles(fontScale), [fontScale]);
  const navigation    = useNavigation();
  const insets        = useSafeAreaInsets();
  const audio         = useAudio();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [surahs,       setSurahs]       = useState([]);
  const [reciters,     setReciters]     = useState([]);
  const [tafsirs,      setTafsirs]      = useState([]);
  const [selectedSurah,   setSelectedSurah]   = useState(null);
  const [bookmarkId,      setBookmarkId]      = useState(null);
  const [loadError,       setLoadError]       = useState(null);
  const [isLoading,       setIsLoading]       = useState(false);

  // ── Selections ────────────────────────────────────────────────────────────
  const [selectedTafsir,  setSelectedTafsir]  = useState(null);
  const [selectedReciter, setSelectedReciter] = useState(null);
  const [modalType,       setModalType]       = useState(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Load baseline data ────────────────────────────────────────────────────
  useEffect(() => {
    const language = getLanguage(lang);
    getSurahs(language).then(setSurahs).catch(() => {});
    getReciters()
      .then((data) => { setReciters(data); if (data.length) setSelectedReciter(data[0]); })
      .catch(() => {});
    getTafsirs(language)
      .then((data) => { setTafsirs(data); if (data.length) setSelectedTafsir(data[0]); })
      .catch(() => {});
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      getBookmark().then((b) => setBookmarkId(b?.surahId ?? null));
    }, [])
  );

  // ── Android back – leaves audio playing ──────────────────────────────────
  useEffect(() => {
    if (!selectedSurah) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedSurah(null);
      return true; // audio keeps playing
    });
    return () => sub.remove();
  }, [selectedSurah]);

  // ── Auto-open playing surah from MiniPlayer click ────────────────────────
  useEffect(() => {
    if (route?.params?.autoOpenSurahId && surahs.length > 0) {
      if (selectedSurah?.id !== route.params.autoOpenSurahId) {
        const s = surahs.find((x) => x.id === route.params.autoOpenSurahId);
        if (s) {
          handleSelectSurah(s);
        }
      }
      // Clear the param so normal navigation doesn't get stuck reopening it
      navigation.setParams({ autoOpenSurahId: undefined });
    }
  }, [route?.params?.autoOpenSurahId, surahs, selectedSurah, handleSelectSurah, navigation]);

  // ── Load surah ────────────────────────────────────────────────────────────
  const handleSelectSurah = useCallback(async (item) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const authorCode  = selectedTafsir?.author_code ?? '';
      const fullContent = await getSurahContent(item.id, toApiLang(lang), authorCode, 1);
      setBookmark(item.id, item.name);
      setBookmarkId(item.id);
      setCurrentPage(1);
      setHasMore(fullContent.pagination?.has_next ?? false);
      setSelectedSurah({ ...item, ...fullContent });
    } catch {
      setLoadError(t.loadError ?? 'Sure yüklenemedi. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTafsir, lang, t.loadError]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !selectedSurah) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const content  = await getSurahContent(
        selectedSurah.id,
        toApiLang(lang),
        selectedTafsir?.author_code ?? '',
        nextPage,
      );
      if (content?.ayas?.length) {
        setSelectedSurah((prev) => ({ ...prev, ayas: [...prev.ayas, ...content.ayas] }));
        setCurrentPage(nextPage);
        setHasMore(content.pagination?.has_next ?? false);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, selectedSurah, selectedTafsir, lang, currentPage]);

  const handleNextSurah = useCallback(() => {
    if (!selectedSurah || selectedSurah.id >= 114) return;
    const s = surahs.find((x) => x.id === selectedSurah.id + 1);
    if (s) handleSelectSurah(s);
  }, [selectedSurah, surahs, handleSelectSurah]);

  const handlePrevSurah = useCallback(() => {
    if (!selectedSurah || selectedSurah.id <= 1) return;
    const s = surahs.find((x) => x.id === selectedSurah.id - 1);
    if (s) handleSelectSurah(s);
  }, [selectedSurah, surahs, handleSelectSurah]);

  // ── Entrance animation ────────────────────────────────────────────────────
  const fadeHeader  = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;
  const fadeList    = useRef(new Animated.Value(0)).current;
  const slideList   = useRef(new Animated.Value(30)).current;

  const playEntrance = useCallback(() => {
    fadeHeader.setValue(0); slideHeader.setValue(-20);
    fadeList.setValue(0);   slideList.setValue(30);
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeHeader,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeList,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideList, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeHeader, slideHeader, fadeList, slideList]);

  useEffect(() => { playEntrance(); }, [playEntrance]);

  const prevSurahRef = useRef(null);
  useEffect(() => {
    if (prevSurahRef.current && !selectedSurah) playEntrance();
    prevSurahRef.current = selectedSurah;
  }, [selectedSurah, playEntrance]);

  /* ── Mini-player bottom respects safe area + tab bar ─────────────────── */
  const miniPlayerBottom = insets.bottom + 72;

  /* ── Selection modals ─────────────────────────────────────────────────── */
  const renderSelectionModal = () => {
    if (!modalType) return null;

    if (modalType === 'settings') {
      return (
        <Modal visible transparent animationType="fade" onRequestClose={() => setModalType(null)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setModalType(null)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.settings ?? 'Ayarlar'}</Text>
                <Pressable onPress={() => setModalType(null)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>
              <Pressable style={styles.settingsRow} onPress={() => setModalType('tafsir')}>
                <Ionicons name="book-outline" size={20} color={colors.accent} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalRowText}>{t.mealSelection ?? 'Meâl Seçimi'}</Text>
                  <Text style={styles.settingsSubLabel}>{selectedTafsir?.author ?? selectedTafsir?.name ?? '—'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
              <Pressable style={styles.settingsRow} onPress={() => setModalType('reciter')}>
                <Ionicons name="mic-outline" size={20} color={colors.accent} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalRowText}>{t.reciterSelection ?? 'Kâri Seçimi'}</Text>
                  <Text style={styles.settingsSubLabel}>{selectedReciter?.name ?? '—'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </Modal>
      );
    }

    const isTafsir = modalType === 'tafsir';
    const data     = isTafsir ? tafsirs : reciters;
    const selected = isTafsir ? selectedTafsir?.id : selectedReciter?.id;
    const title    = isTafsir ? (t.selectMeal ?? 'Meâl Seçin') : (t.selectReciter ?? 'Kâri Seçin');

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalType(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={() => setModalType(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item, i) => item.id?.toString() ?? String(i)}
              renderItem={({ item }) => {
                const label      = isTafsir ? (item.author ?? item.name) : item.name;
                const isSelected = item.id === selected;
                return (
                  <Pressable
                    style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                    onPress={() => {
                      if (isTafsir) {
                        setSelectedTafsir(item);
                        if (selectedSurah) handleSelectSurah(selectedSurah);
                      } else {
                        setSelectedReciter(item);
                      }
                      setModalType(null);
                    }}
                  >
                    <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]} numberOfLines={1}>
                      {label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  /* ── Reader view ──────────────────────────────────────────────────────── */
  if (selectedSurah) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          {isLoading ? (
            <View style={styles.centeredWrap}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : loadError ? (
            <View style={styles.centeredWrap}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable style={styles.retryBtn} onPress={() => handleSelectSurah(selectedSurah)}>
                <Text style={styles.retryText}>{t.retry ?? 'Tekrar Dene'}</Text>
              </Pressable>
            </View>
          ) : (
            <SurahReader
              surah={selectedSurah}
              fontScale={fontScale}
              onBack={() => setSelectedSurah(null)}
              isBookmarked={bookmarkId === selectedSurah.id}
              onBookmark={() => { setBookmark(selectedSurah.id, selectedSurah.name); setBookmarkId(selectedSurah.id); }}
              t={t}
              onNext={handleNextSurah}
              onPrev={handlePrevSurah}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
              selectedReciter={selectedReciter}
            />
          )}

          </SafeAreaView>
      </ScreenBackground>
    );
  }

  /* ── Surah list view ──────────────────────────────────────────────────── */
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.headerBlock, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
          <View style={styles.headerRow}>
            <Pressable style={styles.hBackBtn} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>{t.quranSubtitle ?? "Kur'an-ı Kerim"}</Text>
            </View>
            <Pressable style={styles.hSettingsBtn} onPress={() => setModalType('settings')} hitSlop={8}>
              <Ionicons name="settings-outline" size={22} color={colors.accent} />
            </Pressable>
          </View>

          <View style={styles.selectionArea}>
            <Pressable style={styles.selectionCard} onPress={() => setModalType('tafsir')}>
              <Text style={styles.selectionLabel}>{t.mealSelection ?? 'MEÂL SEÇİMİ'}</Text>
              <View style={styles.selectionValueRow}>
                <Text style={styles.selectionValue} numberOfLines={1}>
                  {selectedTafsir ? (selectedTafsir.author ?? selectedTafsir.name) : (t.loading ?? 'Yükleniyor...')}
                </Text>
                <Ionicons name="swap-vertical" size={14} color={colors.accent} />
              </View>
            </Pressable>
            <Pressable style={styles.selectionCard} onPress={() => setModalType('reciter')}>
              <Text style={styles.selectionLabel}>{t.reciterSelection ?? 'KÂRİ SEÇİMİ'}</Text>
              <View style={styles.selectionValueRow}>
                <Text style={styles.selectionValue} numberOfLines={1}>
                  {selectedReciter?.name ?? (t.loading ?? 'Yükleniyor...')}
                </Text>
                <Ionicons name="swap-vertical" size={14} color={colors.accent} />
              </View>
            </Pressable>
          </View>

          {bookmarkId && (
            <View style={styles.bookmarkBanner}>
              <Pressable
                style={styles.bookmarkBtn}
                onPress={() => { const s = surahs.find((x) => x.id === bookmarkId); if (s) handleSelectSurah(s); }}
              >
                <Ionicons name="bookmark" size={18} color={colors.accent} />
                <Text style={styles.bookmarkText}>
                  {t.continueReading} – {surahs.find((x) => x.id === bookmarkId)?.name}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </Pressable>
            </View>
          )}
        </Animated.View>

        <Animated.View style={[styles.listWrap, { opacity: fadeList, transform: [{ translateY: slideList }] }]}>
          <FlatList
            data={surahs}
            keyExtractor={surahKeyExtractor}
            contentContainerStyle={surahs.length === 0 ? styles.listEmpty : styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS !== 'web'}
            getItemLayout={surahGetItemLayout}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="book-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>{t.loading ?? 'Yükleniyor...'}</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <SurahRowItem
                item={item}
                index={index}
                total={surahs.length}
                isBookmarked={bookmarkId === item.id}
                onPress={handleSelectSurah}
                styles={styles}
                t={t}
              />
            )}
          />
        </Animated.View>

        {renderSelectionModal()}
      </SafeAreaView>
    </ScreenBackground>
  );
}



/* ─────────────────────────────────────────────────────────────────────────────
   FLAT LIST HELPERS
   ───────────────────────────────────────────────────────────────────────────── */
const surahKeyExtractor  = (item) => String(item.id);
const surahGetItemLayout = (_, index) => ({ length: SURAH_ROW_HEIGHT, offset: SURAH_ROW_HEIGHT * index, index });

/* ─────────────────────────────────────────────────────────────────────────────
   SURAH ROW
   ───────────────────────────────────────────────────────────────────────────── */
const SurahRowItem = memo(function SurahRowItem({ item, index, total, isBookmarked, onPress, styles, t }) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.surahRow,
        pressed && styles.surahRowPressed,
        index < total - 1 && styles.surahRowBorder,
        isBookmarked && styles.surahRowBookmarked,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} suresi, ${item.ayahCount} ${t.ayahCountLabel}`}
    >
      <View style={styles.surahNumBadge}>
        <Ionicons name="sunny" size={32} color="rgba(200, 161, 90, 0.15)" style={styles.surahNumBg} />
        <Text style={styles.surahNum}>{item.id}</Text>
      </View>
      <View style={styles.surahInfo}>
        <Text style={styles.surahName}>{item.name}</Text>
        <Text style={styles.surahAyah}>{item.ayahCount} {t.ayahCountLabel}</Text>
      </View>
      <Text style={styles.surahArabic}>{item.arabic}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   AYA CARD
   ───────────────────────────────────────────────────────────────────────────── */
const AyaCard = memo(function AyaCard({ aya, fallbackMeaning, styles, onPlay, isPlaying, isBuffering }) {
  const meaningText = aya.tafsirs?.[0]?.text ?? null;
  return (
    <View style={[styles.ayaCard, isPlaying && styles.ayaCardPlaying]}>
      <View style={styles.ayaCardHeader}>
        <View style={styles.ayaActions}>
          <Pressable
            style={[styles.iconBtn, isPlaying && styles.iconBtnActive]}
            onPress={onPlay}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Durdur' : 'Oynat'}
            hitSlop={4}
          >
            {isBuffering
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={colors.accent} />
            }
          </Pressable>
          <Pressable style={styles.iconBtnSecondary} accessibilityRole="button" accessibilityLabel="Paylaş" hitSlop={4}>
            <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.ayaBadge}>
          <Ionicons name="sunny" size={42} color="rgba(200, 161, 90, 0.2)" style={styles.ayaBadgeBg} />
          <Text style={styles.ayaBadgeNum}>{aya.aya_number}</Text>
        </View>
      </View>
      <Text style={styles.arabicText} accessibilityLanguage="ar">{aya.text}</Text>
      {!!aya.transliteration && (
        <Text style={styles.transliterationText}>{aya.transliteration}</Text>
      )}
      <View style={styles.meaningSection}>
        <Text style={styles.meaningText}>{meaningText ?? fallbackMeaning}</Text>
      </View>
    </View>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   SURAH READER
   ───────────────────────────────────────────────────────────────────────────── */
function SurahReader({
  surah, fontScale, onBack, isBookmarked, onBookmark,
  t, onNext, onPrev, onLoadMore, loadingMore, selectedReciter,
}) {
  const styles      = useMemo(() => createStyles(fontScale), [fontScale]);
  const audio       = useAudio();
  const flatListRef = useRef(null);
  const fadeIn      = useRef(new Animated.Value(0)).current;
  const slideIn     = useRef(new Animated.Value(20)).current;

  // ── Entrance animation ──────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideIn]);

  // ── Auto-scroll: keep the playing aya in view ───────────────────────────
  const isThisSurahPlaying = audio.playingSurah?.id === surah.id;

  useEffect(() => {
    if (!isThisSurahPlaying || !audio.playingAya || !surah.ayas?.length) return;
    const idx = surah.ayas.findIndex((a) => a.id === audio.playingAya.id);
    if (idx === -1) return;

    // Small delay so the FlatList has settled after any state update
    const timer = setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.3, // 30% from top → aya centred-ish on screen
        });
      } catch {
        // Item not yet rendered – fall back to offset
        flatListRef.current?.scrollToOffset({
          offset: TITLE_CARD_HEIGHT + idx * AYA_CARD_ESTIMATED_HEIGHT,
          animated: true,
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [audio.playingAya?.id, isThisSurahPlaying]); // eslint-disable-line

  // ── Mekki / Medeni ──────────────────────────────────────────────────────
  const revealedIn = surah.revelationType ?? surah.revelation_type ?? null;
  const mekkeOrMedine = revealedIn
    ? (revealedIn.toLowerCase().includes('mecca') || revealedIn.toLowerCase().includes('mekk')
        ? (t.mekke ?? 'Mekke Devri')
        : (t.medine ?? 'Medine Devri'))
    : '';

  // ── Render aya ──────────────────────────────────────────────────────────
  const renderAya = useCallback(({ item }) => {
    const isSelected = isThisSurahPlaying && audio.playingAya?.id === item.id;
    const isPlaying  = isSelected && audio.isPlaying;
    const isBuffering = isSelected && !audio.isLoaded;
    return (
      <AyaCard
        aya={item}
        fallbackMeaning={surah.meaning}
        styles={styles}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        onPlay={() => audio.playAya(item, surah, selectedReciter)}
      />
    );
  }, [surah, styles, audio, selectedReciter, isThisSurahPlaying]);

  const keyExtractor = useCallback((item, i) => String(item.aya_number ?? i), []);

  // getItemLayout enables reliable scrollToIndex for off-screen items
  const getItemLayout = useCallback((_, index) => ({
    length: AYA_CARD_ESTIMATED_HEIGHT,
    offset: TITLE_CARD_HEIGHT + AYA_CARD_ESTIMATED_HEIGHT * index,
    index,
  }), []);

  const ListHeader = useMemo(() => (
    <View style={styles.titleCard}>
      <Ionicons name="moon" size={32} color={colors.accent} style={styles.titleCardIcon} />
      <Text style={styles.surahHeadline}>{surah.name} Suresi</Text>
      <View style={styles.ornateDivider} />
      <Text style={styles.bismillahArabic} accessibilityLanguage="ar">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </Text>
      {!!mekkeOrMedine && (
        <Text style={styles.surahMeta}>{mekkeOrMedine} • {surah.ayahCount} {t.ayahCountLabel}</Text>
      )}
    </View>
  ), [surah.name, surah.ayahCount, mekkeOrMedine, styles, t.ayahCountLabel]);

  const ListFooter = useMemo(() => (
    <View style={styles.paginationFooterWrapper}>
      {loadingMore && <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: 20 }} />}
      <View style={styles.paginationFooter}>
        <Pressable style={styles.paginationPill} onPress={onPrev} hitSlop={4}>
          <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
          <Text style={styles.paginationText}>{t.prevSurah ?? 'Önceki'}</Text>
        </Pressable>
        <View style={{ width: 10 }} />
        <Pressable style={styles.paginationPill} onPress={onNext} hitSlop={4}>
          <Text style={styles.paginationText}>{t.nextSurah ?? 'Sonraki'}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  ), [loadingMore, onPrev, onNext, styles, t.prevSurah, t.nextSurah]);

  return (
    <Animated.View style={[styles.readerWrap, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
      <View style={styles.readerHeader}>
        <Pressable style={styles.rBackBtn} onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.rTitle} numberOfLines={1}>{surah.name}</Text>
        <Pressable onPress={onBookmark} style={styles.rActionBtn} hitSlop={8}>
          <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={colors.accent} />
        </Pressable>
      </View>

      {surah.ayas?.length ? (
        <FlatList
          ref={flatListRef}
          data={surah.ayas}
          renderItem={renderAya}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.readerScroll}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== 'web'}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            // Scroll to approximate position first, then retry
            flatListRef.current?.scrollToOffset({
              offset: index * averageItemLength,
              animated: false,
            });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
            }, 200);
          }}
        />
      ) : (
        <FlatList
          data={[{ id: 'fallback' }]}
          renderItem={() => (
            <View style={styles.ayaCard}>
              <Text style={styles.arabicText} accessibilityLanguage="ar">{surah.text}</Text>
              <View style={styles.meaningSection}>
                <Text style={styles.meaningText}>{surah.meaning}</Text>
              </View>
            </View>
          )}
          keyExtractor={() => 'fallback'}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.readerScroll}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
   ───────────────────────────────────────────────────────────────────────────── */
const createStyles = (fs = 1) =>
  StyleSheet.create({
    safe: { flex: 1 },

    centeredWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
    errorText:    { fontSize: 15 * fs, color: colors.textMuted, textAlign: 'center' },
    retryBtn:     { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, backgroundColor: 'rgba(200, 161, 90, 0.15)', borderWidth: 1, borderColor: 'rgba(200, 161, 90, 0.3)' },
    retryText:    { fontSize: 14 * fs, fontWeight: '600', color: colors.accent },

    headerBlock:   { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 10 },
    headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    headerCenter:  { alignItems: 'center', flex: 1 },
    hBackBtn:      { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    hSettingsBtn:  { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
    title:         { fontSize: 20 * fs, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.3 },

    selectionArea:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
    selectionCard:     { flex: 1, backgroundColor: 'rgba(0, 75, 55, 0.4)', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(200, 161, 90, 0.2)' },
    selectionLabel:    { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', color: 'rgba(124, 186, 160, 0.9)', marginBottom: 6, letterSpacing: 0.5 },
    selectionValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectionValue:    { color: colors.white, fontSize: 13 * fs, fontWeight: '500', flex: 1, marginRight: 8 },

    bookmarkBanner: { marginBottom: 16 },
    bookmarkBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200, 161, 90, 0.12)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 8 },
    bookmarkText:   { flex: 1, fontSize: 13 * fs, fontWeight: '600', color: colors.accent },

    listWrap:    { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    listEmpty:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyWrap:   { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText:   { color: colors.textMuted, fontSize: 14 * fs },

    surahRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, gap: 12, height: SURAH_ROW_HEIGHT },
    surahRowPressed:    { backgroundColor: 'rgba(200, 161, 90, 0.08)', borderRadius: 12 },
    surahRowBorder:     { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    surahRowBookmarked: { backgroundColor: 'rgba(200, 161, 90, 0.08)', borderRadius: 12 },
    surahNumBadge:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    surahNumBg:         { position: 'absolute' },
    surahNum:           { fontSize: 12 * fs, fontWeight: '700', color: colors.accent },
    surahInfo:          { flex: 1 },
    surahName:          { fontSize: 16 * fs, fontWeight: '600', color: colors.textPrimary },
    surahAyah:          { fontSize: 12 * fs, color: colors.textMuted, marginTop: 2 },
    surahArabic:        { fontSize: 20 * fs, color: colors.accent, fontWeight: '500', marginRight: 6 },

    modalOverlay:         { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent:         { backgroundColor: colors.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%', minHeight: '40%' },
    modalHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:           { fontSize: 18 * fs, fontWeight: '700', color: colors.textPrimary },
    modalRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    modalRowSelected:     { backgroundColor: 'rgba(200, 161, 90, 0.05)' },
    modalRowText:         { fontSize: 15 * fs, color: colors.textPrimary, flex: 1, marginRight: 8 },
    modalRowTextSelected: { color: colors.accent, fontWeight: '600' },
    settingsRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    settingsSubLabel:     { color: colors.textMuted, fontSize: 12 * fs, marginTop: 2 },

    readerWrap:   { flex: 1 },
    readerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    rBackBtn:     { padding: 4 },
    rTitle:       { fontSize: 18 * fs, fontWeight: '600', color: colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: 8 },
    rActionBtn:   { padding: 4 },
    readerScroll: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 120 },

    titleCard: {
      backgroundColor: 'rgba(0, 50, 36, 0.4)',
      borderRadius: 20, padding: 30, alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(200, 161, 90, 0.3)',
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 }, marginBottom: 24, overflow: 'hidden',
    },
    titleCardIcon:   { marginBottom: 12 },
    surahHeadline:   { fontSize: 26 * fs, fontWeight: '700', color: colors.accent, marginBottom: 8 },
    ornateDivider:   { width: 60, height: 1.5, backgroundColor: colors.accent, marginVertical: 16, opacity: 0.6 },
    bismillahArabic: { fontSize: 28 * fs, color: 'rgba(200, 161, 90, 0.9)', lineHeight: 44, marginBottom: 12 },
    surahMeta:       { fontSize: 12 * fs, color: 'rgba(124, 186, 160, 0.8)', textTransform: 'uppercase', letterSpacing: 1 },

    ayaCard: {
      backgroundColor: 'rgba(246, 243, 234, 0.04)',
      borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: 'rgba(200, 161, 90, 0.1)', marginBottom: 16,
    },
    ayaCardPlaying:   { borderColor: 'rgba(200, 161, 90, 0.5)', backgroundColor: 'rgba(200, 161, 90, 0.08)' },
    ayaCardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    ayaActions:       { flexDirection: 'row', gap: 8 },
    iconBtn: {
      width: 38, height: 38, borderRadius: 19,
      borderWidth: 1, borderColor: 'rgba(200, 161, 90, 0.3)',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(200, 161, 90, 0.05)',
    },
    iconBtnActive:    { backgroundColor: 'rgba(200, 161, 90, 0.15)', borderColor: colors.accent },
    iconBtnSecondary: {
      width: 38, height: 38, borderRadius: 19,
      borderWidth: 1, borderColor: 'rgba(107, 128, 112, 0.3)',
      alignItems: 'center', justifyContent: 'center',
    },
    ayaBadge:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    ayaBadgeBg:  { position: 'absolute' },
    ayaBadgeNum: { fontSize: 13 * fs, fontWeight: '700', color: colors.accent },
    arabicText:  { fontSize: 28 * fs, lineHeight: 48, color: colors.textPrimary, textAlign: 'right', marginBottom: 20 },
    transliterationText: { fontSize: 13 * fs, fontStyle: 'italic', color: colors.textSecondary, marginBottom: 8, lineHeight: 22 },
    meaningSection: { paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(200, 161, 90, 0.1)' },
    meaningText:    { fontSize: 15 * fs, lineHeight: 24, color: colors.textPrimary, fontWeight: '500' },



    paginationFooterWrapper: { marginTop: 8 },
    paginationFooter: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 30 },
    paginationPill: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(200, 161, 90, 0.08)',
      paddingVertical: 10, paddingHorizontal: 16,
      borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200, 161, 90, 0.15)', gap: 6,
    },
    paginationText: { fontSize: 12 * fs, fontWeight: '600', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  });