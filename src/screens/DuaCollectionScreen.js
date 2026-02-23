import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '../components/ScreenBackground';
import { DUA_CATEGORIES } from '../data/duaData';
import { colors } from '../theme/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ── Dua Item Component ────────────────────────── */
function DuaItem({ dua }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  }, []);

  return (
    <Pressable style={styles.duaCard} onPress={toggle}>
      <View style={styles.duaTitleRow}>
        <Text style={styles.duaTitle}>{dua.title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </View>

      {expanded && (
        <View style={styles.duaContent}>
          {/* Arabic text */}
          {dua.arabic && (
            <Text style={styles.duaArabic}>{dua.arabic}</Text>
          )}

          {/* Transliteration */}
          {dua.transliteration && (
            <View style={styles.duaSection}>
              <Text style={styles.duaSectionLabel}>Okunuşu</Text>
              <Text style={styles.duaTransliteration}>{dua.transliteration}</Text>
            </View>
          )}

          {/* Meaning */}
          <View style={styles.duaSection}>
            <Text style={styles.duaSectionLabel}>Anlamı</Text>
            <Text style={styles.duaMeaning}>{dua.meaning}</Text>
          </View>

          {/* Source */}
          <Text style={styles.duaSource}>— {dua.source}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ── Category Section ──────────────────────────── */
function CategorySection({ category, index }) {
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
            <DuaItem key={dua.id} dua={dua} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────── */
export function DuaCollectionScreen() {
  const navigation = useNavigation();

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
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Categories List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {DUA_CATEGORIES.map((cat, idx) => (
            <CategorySection key={cat.id} category={cat} index={idx} />
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ── Styles ─────────────────────────────────────── */
const styles = StyleSheet.create({
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
});
