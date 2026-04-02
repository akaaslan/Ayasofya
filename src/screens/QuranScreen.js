import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
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
import { getSurahs, getSurahContent, getReciters, getTafsirs } from '../utils/quranApi';

/* ── Component ─────────────────────────────────── */
export function QuranScreen() {
  useTheme();
  const { t, lang } = useI18n();
  const styles = createStyles();
  const navigation = useNavigation();

  // Core Data
  const [surahs, setSurahs] = useState([]);
  const [reciters, setReciters] = useState([]);
  const [tafsirs, setTafsirs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [bookmarkId, setBookmarkId] = useState(null);

  // Selections
  const [selectedTafsir, setSelectedTafsir] = useState(null);
  const [selectedReciter, setSelectedReciter] = useState(null);
  const [modalType, setModalType] = useState(null); // 'tafsir' | 'reciter' | null

  /* ── Load baseline data ── */
  useEffect(() => {
    // Load surahs
    getSurahs(lang === 'tr' ? 'turkish' : 'english').then(setSurahs);
    // Load reciters
    getReciters().then((data) => {
      setReciters(data);
      if (data.length > 0) setSelectedReciter(data[0]);
    });
    // Load tafsirs
    getTafsirs(lang === 'tr' ? 'turkish' : 'english').then((data) => {
      setTafsirs(data);
      if (data.length > 0) setSelectedTafsir(data[0]);
    });
  }, [lang]);

  /* ── Load bookmark ── */
  useFocusEffect(
    useCallback(() => {
      getBookmark().then((b) => setBookmarkId(b?.surahId ?? null));
    }, [])
  );

  const handleSelectSurah = async (item) => {
    // Fetch full content including ayas and tafsir
    const authorCode = selectedTafsir?.author_code || '';
    const fullContent = await getSurahContent(item.id, lang === 'tr' ? 'turkish' : 'english', authorCode);
    const surahToDisplay = { ...item, ...fullContent };
    
    setBookmark(item.id, item.name);
    setBookmarkId(item.id);
    setSelectedSurah(surahToDisplay);
  };

  const handleNextSurah = async () => {
    const nextId = selectedSurah.id + 1;
    if (nextId <= 114) {
      const s = surahs.find(x => x.id === nextId);
      if (s) handleSelectSurah(s);
    }
  };

  const handlePrevSurah = async () => {
    const prevId = selectedSurah.id - 1;
    if (prevId >= 1) {
      const s = surahs.find(x => x.id === prevId);
      if (s) handleSelectSurah(s);
    }
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

  /* ── Selection Modals ── */
  const renderSelectionModal = () => {
    if (!modalType) return null;
    
    const isTafsir = modalType === 'tafsir';
    const data = isTafsir ? tafsirs : reciters;
    const currentSelected = isTafsir ? selectedTafsir?.id : selectedReciter?.id;
    const title = isTafsir ? t.selectMeal || 'Meâl Seçin' : t.selectReciter || 'Kâri Seçin';

    return (
      <Modal visible={true} transparent animationType="fade" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalType(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={() => setModalType(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              renderItem={({ item }) => {
                const label = isTafsir ? item.author || item.name : item.name;
                const isSelected = item.id === currentSelected;
                return (
                  <Pressable
                    style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                    onPress={() => {
                      if (isTafsir) {
                        setSelectedTafsir(item);
                        // If already reading a surah, reload it with new tafsir
                        if (selectedSurah) {
                          handleSelectSurah(selectedSurah);
                        }
                      } else {
                        setSelectedReciter(item);
                      }
                      setModalType(null);
                    }}
                  >
                    <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]}>
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
            onNext={handleNextSurah}
            onPrev={handlePrevSurah}
          />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  /* ── Surah List View ── */
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <Animated.View
          style={[
            styles.headerBlock,
            { opacity: fadeHeader, transform: [{ translateY: slideHeader }] },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable style={styles.hBackBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>{t.quranSubtitle || "Kur'an-ı Kerim"}</Text>
            </View>
            <Pressable style={styles.hSettingsBtn}>
              <Ionicons name="settings-outline" size={22} color={colors.accent} />
            </Pressable>
          </View>

          {/* Selection Area (Meâl and Kâri) */}
          <View style={styles.selectionArea}>
            <Pressable style={styles.selectionCard} onPress={() => setModalType('tafsir')}>
              <Text style={styles.selectionLabel}>{t.mealSelection || "MEÂL SEÇİMİ"}</Text>
              <View style={styles.selectionValueRow}>
                <Text style={styles.selectionValue} numberOfLines={1}>
                  {selectedTafsir ? (selectedTafsir.author || selectedTafsir.name) : "Yükleniyor..."}
                </Text>
                <Ionicons name="swap-vertical" size={14} color={colors.accent} />
              </View>
            </Pressable>
            <Pressable style={styles.selectionCard} onPress={() => setModalType('reciter')}>
              <Text style={styles.selectionLabel}>{t.reciterSelection || "KÂRİ SEÇİMİ"}</Text>
              <View style={styles.selectionValueRow}>
                <Text style={styles.selectionValue} numberOfLines={1}>
                  {selectedReciter ? selectedReciter.name : "Yükleniyor..."}
                </Text>
                <Ionicons name="swap-vertical" size={14} color={colors.accent} />
              </View>
            </Pressable>
          </View>

          {/* bookmark resume banner */}
          {bookmarkId && (
            <View style={styles.bookmarkBanner}>
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
            </View>
          )}
        </Animated.View>

        {/* Surah List */}
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
            )}
          />
        </Animated.View>

        {renderSelectionModal()}
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Surah Reading Sub-component ──────────────── */
function SurahReader({ surah, onBack, isBookmarked, onBookmark, t, onNext, onPrev }) {
  const styles = createStyles();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const mekkeOrMedine = surah.id < 50 ? t.mekke || "Mekke Devri" : t.medine || "Medine Devri"; // Crude fallback, ideally comes from API
  
  return (
    <Animated.View
      style={[
        styles.readerWrap,
        { opacity: fadeIn, transform: [{ translateY: slideIn }] },
      ]}
    >
      {/* Reader Header */}
      <View style={styles.readerHeader}>
        <Pressable style={styles.rBackBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.rTitle}>{surah.name}</Text>
        <Pressable onPress={onBookmark} style={styles.rActionBtn}>
          <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.readerScroll} showsVerticalScrollIndicator={false}>
        
        {/* Title Card (Ornate) */}
        <View style={styles.titleCard}>
          <Ionicons name="moon" size={32} color={colors.accent} style={styles.titleCardIcon} />
          <Text style={styles.surahHeadline}>{surah.name} Suresi</Text>
          <View style={styles.ornateDivider} />
          <Text style={styles.bismillahArabic}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
          <Text style={styles.surahMeta}>{mekkeOrMedine} • {surah.ayahCount} {t.ayahCountLabel}</Text>
        </View>

        {/* Aya List */}
        {surah.ayas ? (
          surah.ayas.map((a, i) => {
            // Find tafsir meaning from the aya object if available. 
            // In API we fetched everything, currently quranApi.js builds a single meaning,
            // but let's assume we have `a.tafsirs` or fallback
            // For now, if quranApi doesn't attach meaning to aya, we'll try to find it
            const meaningText = a.tafsirs && a.tafsirs.length > 0 ? a.tafsirs[0].text : null;
            
            return (
              <View key={i} style={styles.ayaCard}>
                <View style={styles.ayaCardHeader}>
                  <View style={styles.ayaActions}>
                    <Pressable style={styles.iconBtn}>
                      <Ionicons name="play" size={16} color={colors.accent} />
                    </Pressable>
                    <Pressable style={styles.iconBtnSecondary}>
                      <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                  <View style={styles.ayaBadge}>
                    <Ionicons name="sunny" size={42} color="rgba(200, 161, 90, 0.2)" style={styles.ayaBadgeBg} />
                    <Text style={styles.ayaBadgeNum}>{a.aya_number}</Text>
                  </View>
                </View>
                
                <Text style={styles.arabicText}>{a.text}</Text>
                
                {/* Optional Transliteration */}
                {a.transliteration && (
                  <Text style={styles.transliterationText}>{a.transliteration}</Text>
                )}
                
                {/* Meaning */}
                <View style={styles.meaningSection}>
                  <Text style={styles.meaningText}>{meaningText || surah.meaning}</Text>
                </View>
              </View>
            );
          })
        ) : (
          /* Backward compatibility for local fallback data */
          <View style={styles.ayaCard}>
            <Text style={styles.arabicText}>{surah.text}</Text>
            <View style={styles.meaningSection}>
              <Text style={styles.meaningText}>{surah.meaning}</Text>
            </View>
          </View>
        )}

        {/* Pagination Footer */}
        <View style={styles.paginationFooter}>
          <Pressable style={styles.paginationPill} onPress={onPrev}>
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={styles.paginationText}>{t.prevSurah || 'Önceki'}</Text>
          </Pressable>
          <View style={{ width: 10 }} />
          <Pressable style={styles.paginationPill} onPress={onNext}>
            <Text style={styles.paginationText}>{t.nextSurah || 'Sonraki'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

      </ScrollView>
    </Animated.View>
  );
}

/* ── Styles ─────────────────────────────────────── */
const createStyles = () => ({
  safe: { flex: 1 },

  /* Header */
  headerBlock: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  hBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  hSettingsBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  /* Selection Area */
  selectionArea: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  selectionCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 75, 55, 0.4)', // bg-primary-container
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.2)', // border-tertiary-fixed
  },
  selectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: 'rgba(124, 186, 160, 0.9)', // text-on-primary-container
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  selectionValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },

  /* Bookmark banner */
  bookmarkBanner: {
    marginBottom: 16,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 161, 90, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookmarkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },

  /* List */
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

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
    borderRadius: 12,
  },
  surahRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  surahNumBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumBg: {
    position: 'absolute',
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
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  surahArabic: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: '500',
    marginRight: 6,
  },
  surahRowBookmarked: {
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    borderRadius: 12,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  modalRowSelected: {
    backgroundColor: 'rgba(200, 161, 90, 0.05)',
  },
  modalRowText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  modalRowTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },

  /* Reader */
  readerWrap: { flex: 1 },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rBackBtn: { padding: 4 },
  rTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rActionBtn: { padding: 4 },

  /* Reader scroll */
  readerScroll: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 },

  /* Title Card */
  titleCard: {
    backgroundColor: 'rgba(0, 50, 36, 0.4)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 24,
    overflow: 'hidden',
  },
  titleCardIcon: {
    marginBottom: 12,
  },
  surahHeadline: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
  },
  ornateDivider: {
    width: 60,
    height: 1.5,
    backgroundColor: colors.accent,
    marginVertical: 16,
    opacity: 0.6,
  },
  bismillahArabic: {
    fontSize: 28,
    color: 'rgba(200, 161, 90, 0.9)',
    lineHeight: 44,
    marginBottom: 12,
  },
  surahMeta: {
    fontSize: 12,
    color: 'rgba(124, 186, 160, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* Aya Card */
  ayaCard: {
    backgroundColor: 'rgba(246, 243, 234, 0.04)', // surface-container-low in dark layout
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.1)',
    marginBottom: 16,
  },
  ayaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ayaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200, 161, 90, 0.05)',
  },
  iconBtnSecondary: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(107, 128, 112, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayaBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayaBadgeBg: {
    position: 'absolute',
  },
  ayaBadgeNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  arabicText: {
    fontSize: 28,
    lineHeight: 48,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 20,
  },
  transliterationText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  meaningSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 161, 90, 0.1)',
  },
  meaningText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  /* Pagination Footer */
  paginationFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  paginationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.15)',
    gap: 6,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
