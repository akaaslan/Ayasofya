import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
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
import { colors } from '../theme/colors';
import { SURAHS } from '../data/surahData';

/* ── Component ─────────────────────────────────── */
export function QuranScreen() {
  const navigation = useNavigation();
  const [selectedSurah, setSelectedSurah] = useState(null);

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
          <SurahReader surah={selectedSurah} onBack={() => setSelectedSurah(null)} />
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
              <Text style={styles.title}>Kur'an-ı Kerim</Text>
              <Text style={styles.subtitle}>Kısa Sureler (Amme Cüzü)</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>
        </Animated.View>

        {/* list */}
        <Animated.View
          style={[
            styles.listWrap,
            { opacity: fadeList, transform: [{ translateY: slideList }] },
          ]}
        >
          <FlatList
            data={SURAHS}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.surahRow,
                  pressed && styles.surahRowPressed,
                  index < SURAHS.length - 1 && styles.surahRowBorder,
                ]}
                onPress={() => setSelectedSurah(item)}
              >
                <View style={styles.surahNumBadge}>
                  <Text style={styles.surahNum}>{item.id}</Text>
                </View>
                <View style={styles.surahInfo}>
                  <Text style={styles.surahName}>{item.name}</Text>
                  <Text style={styles.surahAyah}>{item.ayahCount} ayet</Text>
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
function SurahReader({ surah, onBack }) {
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
          <Text style={styles.backText}>Geri</Text>
        </Pressable>
        <View style={styles.readerTitleWrap}>
          <Text style={styles.readerTitle}>{surah.name}</Text>
          <Text style={styles.readerAyah}>{surah.ayahCount} ayet</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.readerScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Arabic text */}
        <View style={styles.arabicCard}>
          <Text style={styles.arabicText}>{surah.text}</Text>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>Meâl</Text>
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
const styles = StyleSheet.create({
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
});
