import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';

const DUAS = [
  {
    id: '1',
    title: 'Sübhaneke',
    arabic: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلَا إِلَهَ غَيْرُكَ',
    turkish:
      'Allah\'ım! Sen eksik sıfatlardan pak ve uzaksın. Seni daima hamd ile anarım. Senin adın mübarektir. Senin şanın yücedir. Senden başka ilah yoktur.',
  },
  {
    id: '2',
    title: 'Ettehiyyatü',
    arabic: 'اَلتَّحِيَّاتُ لِلّٰهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ',
    turkish:
      'Bütün tahiyyeler, bedenî ve malî ibadetler ve güzel şeyler Allah içindir.',
  },
  {
    id: '3',
    title: 'Ayetel Kürsi',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    turkish:
      'Allah, O\'ndan başka ilâh yoktur. O, Hayy\'dır, Kayyûm\'dur.',
  },
  {
    id: '4',
    title: 'Kunut Duası',
    arabic: 'اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ',
    turkish:
      'Allah\'ım! Senden yardım isteriz, senden mağfiret dileriz.',
  },
  {
    id: '5',
    title: 'Salavat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِ سَيِّدِنَا مُحَمَّدٍ',
    turkish:
      'Allah\'ım! Efendimiz Muhammed\'e ve Efendimiz Muhammed\'in âline rahmet eyle.',
  },
  {
    id: '6',
    title: 'İftar Duası',
    arabic: 'اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    turkish:
      'Allah\'ım! Senin rızan için oruç tuttum, sana inandım, sana güvendim ve senin rızkınla orucumu açtım.',
  },
];

export function DualarScreen() {
  const [expandedId, setExpandedId] = useState(null);

  const toggle = useCallback(
    (id) => setExpandedId((prev) => (prev === id ? null : id)),
    [],
  );

  const renderItem = ({ item }) => {
    const isOpen = expandedId === item.id;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => toggle(item.id)}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={styles.cardHeader}>
          <Ionicons
            name={isOpen ? 'book' : 'book-outline'}
            size={20}
            color={colors.accent}
          />
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </View>
        {isOpen && (
          <View style={styles.cardBody}>
            <Text style={styles.arabic}>{item.arabic}</Text>
            <View style={styles.divider} />
            <Text style={styles.turkish}>{item.turkish}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.header}>DUALAR</Text>
        <FlatList
          data={DUAS}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 44,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.15)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  arabic: {
    color: colors.accent,
    fontSize: 20,
    lineHeight: 36,
    textAlign: 'right',
    fontWeight: '400',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 10,
  },
  turkish: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});
