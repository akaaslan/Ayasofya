import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  LayoutAnimation,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { DUA_CATEGORIES } from '../data/duaData';
import { colors } from '../theme/colors';
import { getDuaFavorites, toggleDuaFavorite } from '../utils/duaFavorites';



/* ── Dua Item Component ────────────────────────── */
function DuaItem({ dua, isFavorite, onToggleFavorite }) {
  const styles = createStyles();
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  }, []);

  const handleShare = useCallback(async () => {
    let text = dua.title;
    if (dua.arabic) text += `\n\n${dua.arabic}`;
    if (dua.transliteration) text += `\n\nOkunuşu: ${dua.transliteration}`;
    text += `\n\nAnlamı: ${dua.meaning}`;
    text += `\n\n— ${dua.source}`;
    text += '\n\n📿 Ayasofya Uygulaması';
    await Share.share({ message: text });
  }, [dua]);

  return (
    <Pressable style={styles.duaCard} onPress={toggle}>
      <View style={styles.duaTitleRow}>
        <Text style={styles.duaTitle}>{dua.title}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => onToggleFavorite(dua.id)} hitSlop={8}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#e87498' : colors.textMuted}
            />
          </Pressable>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </View>

      {expanded && (
        <View style={styles.duaContent}>
          {dua.arabic && (
            <Text style={styles.duaArabic}>{dua.arabic}</Text>
          )}

          {dua.transliteration && (
            <View style={styles.duaSection}>
              <Text style={styles.duaSectionLabel}>Okunuşu</Text>
              <Text style={styles.duaTransliteration}>{dua.transliteration}</Text>
            </View>
          )}

          <View style={styles.duaSection}>
            <Text style={styles.duaSectionLabel}>Anlamı</Text>
            <Text style={styles.duaMeaning}>{dua.meaning}</Text>
          </View>

          <View style={styles.duaActions}>
            <Text style={styles.duaSource}>— {dua.source}</Text>
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={16} color={colors.accent} />
              <Text style={styles.shareText}>Paylaş</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/* ── Category Section ──────────────────────────── */
function CategorySection({ category, index, favorites, onToggleFavorite }) {
  const styles = createStyles();
  const [open, setOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  }, []);

  return (
    <Animated.View style={[styles.categoryContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Pressable style={styles.categoryHeader} onPress={toggle}>
        <View style={styles.categoryLeft}>
          <View style={styles.categoryIconWrap}>
            <Ionicons name={category.icon} size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryCount}>{category.duas.length} dua</Text>
          </View>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      {open && (
        <View style={styles.duaList}>
          {category.duas.map((dua) => (
            <DuaItem
              key={dua.id}
              dua={dua}
              isFavorite={favorites.includes(dua.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────── */
// Flatten all duas for search / daily selection
const ALL_DUAS = DUA_CATEGORIES.flatMap((cat) => cat.duas);

function getDailyDua() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);
  return ALL_DUAS[dayOfYear % ALL_DUAS.length];
}

export function DuaCollectionScreen() {
  useTheme();
  const styles = createStyles();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showDailyDua, setShowDailyDua] = useState(false);

  useEffect(() => {
    getDuaFavorites().then(setFavorites);
  }, []);

  const handleToggleFavorite = useCallback(async (duaId) => {
    const updated = await toggleDuaFavorite(duaId);
    setFavorites(updated);
  }, []);

  const dailyDua = useMemo(() => getDailyDua(), []);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return DUA_CATEGORIES.map((cat) => {
      let duas = cat.duas;
      if (q) {
        duas = duas.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            (d.meaning && d.meaning.toLowerCase().includes(q)) ||
            (d.transliteration && d.transliteration.toLowerCase().includes(q))
        );
      }
      if (showFavOnly) {
        duas = duas.filter((d) => favorites.includes(d.id));
      }
      return { ...cat, duas };
    }).filter((cat) => cat.duas.length > 0);
  }, [searchQuery, showFavOnly, favorites]);

  /* ── Entrance animation ── */
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeHeader, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideHeader, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <Animated.View style={[styles.headerRow, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>DUA KOLEKSİYONU</Text>
            <Text style={styles.headerSubtitle}>Günlük ve özel dualar</Text>
          </View>
          <Pressable onPress={() => setShowFavOnly((f) => !f)} style={styles.backBtn}>
            <Ionicons
              name={showFavOnly ? 'heart' : 'heart-outline'}
              size={20}
              color={showFavOnly ? '#e87498' : colors.accent}
            />
          </Pressable>
        </Animated.View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Dua ara..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Categories List */}
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            !searchQuery && !showFavOnly ? (
              <Pressable
                style={styles.dailyCard}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowDailyDua((v) => !v);
                }}
              >
                <View style={styles.dailyHeader}>
                  <Ionicons name="sparkles" size={18} color={colors.accent} />
                  <Text style={styles.dailyTitle}>Günün Duası</Text>
                  <Ionicons
                    name={showDailyDua ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
                {showDailyDua && (
                  <View style={styles.duaContent}>
                    <Text style={styles.duaTitle}>{dailyDua.title}</Text>
                    {dailyDua.arabic && <Text style={styles.duaArabic}>{dailyDua.arabic}</Text>}
                    <Text style={styles.duaMeaning}>{dailyDua.meaning}</Text>
                    <Text style={styles.duaSource}>— {dailyDua.source}</Text>
                  </View>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item, index }) => (
            <CategorySection
              category={item}
              index={index}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {showFavOnly ? 'Henüz favori dua eklemediniz' : 'Sonuç bulunamadı'}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Styles ─────────────────────────────────────── */
const createStyles = () => ({
  safe: { flex: 1 },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
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

  /* Scroll */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Category */
  categoryContainer: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 46, 40, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.12)',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  categoryCount: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  /* Dua List */
  duaList: {
    marginTop: 8,
    marginLeft: 16,
    gap: 8,
  },

  /* Dua Card */
  duaCard: {
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
    padding: 14,
  },
  duaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duaTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  /* Dua Content */
  duaContent: {
    marginTop: 12,
    gap: 12,
  },
  duaArabic: {
    color: colors.accent,
    fontSize: 18,
    textAlign: 'right',
    lineHeight: 32,
    backgroundColor: 'rgba(200, 161, 90, 0.05)',
    borderRadius: 10,
    padding: 14,
  },
  duaSection: {
    gap: 4,
  },
  duaSectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  duaTransliteration: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  duaMeaning: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  duaSource: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  duaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
  },
  shareText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    padding: 0,
  },

  /* Daily Dua */
  dailyCard: {
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.20)',
    padding: 14,
    marginBottom: 16,
  },
  dailyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
