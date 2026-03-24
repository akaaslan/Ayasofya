import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { ESMA_UL_HUSNA } from '../data/esmaData';
import { colors } from '../theme/colors';

/* ── Card Component ─────────────────────────────── */
function EsmaCard({ item, index }) {
  const styles = createStyles();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = Math.min(index * 30, 400);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Number badge */}
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{item.id}</Text>
      </View>

      {/* Arabic name */}
      <Text style={styles.arabicText}>{item.arabic}</Text>

      {/* Turkish transliteration + pronunciation */}
      <View style={styles.nameRow}>
        <Text style={styles.nameText}>{item.name}</Text>
      </View>

      {/* Meaning */}
      <Text style={styles.meaningText} numberOfLines={2}>{item.meaning}</Text>
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────── */
export function EsmaScreen() {
  useTheme();
  const { t } = useI18n();
  const styles = createStyles();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');

  /* ── Entrance animations ── */
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeHeader, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideHeader, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return ESMA_UL_HUSNA;
    const q = search.toLowerCase().trim();
    return ESMA_UL_HUSNA.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.arabic.includes(q) ||
        String(item.id) === q,
    );
  }, [search]);

  const renderItem = useCallback(({ item, index }) => (
    <EsmaCard item={item} index={index} />
  ), []);

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <Animated.View style={[styles.headerRow, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t.esmaTitle || 'ESMA-ÜL HÜSNA'}</Text>
            <Text style={styles.headerSubtitle}>{t.esmaSubtitle || "Allah'ın 99 Güzel İsmi"}</Text>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t.esmaSearch || "İsim veya anlam ara..."}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Count */}
        <Text style={styles.countText}>
          {filtered.length === 99 ? `99 ${t.names || 'İsim'}` : `${filtered.length} ${t.results || 'sonuç'}`}
        </Text>

        {/* Grid */}
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={7}
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

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.15)',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    padding: 0,
  },

  /* Count */
  countText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },

  /* Grid */
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  /* Card */
  card: {
    flex: 1,
    backgroundColor: 'rgba(10, 46, 40, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.12)',
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    gap: 6,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 161, 90, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  numberText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  arabicText: {
    color: colors.accent,
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 34,
    marginTop: 4,
  },
  nameText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  speakBtn: {
    padding: 4,
  },
  meaningText: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
