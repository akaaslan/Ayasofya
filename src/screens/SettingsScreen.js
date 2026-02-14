import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Konya'];

export function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedCity, setSelectedCity] = useState('İstanbul');

  const handleCitySelect = useCallback(() => {
    Alert.alert(
      'Şehir Seçin',
      undefined,
      [
        ...CITIES.map((city) => ({
          text: city,
          onPress: () => setSelectedCity(city),
        })),
        { text: 'İptal', style: 'cancel' },
      ],
    );
  }, []);

  const handleAbout = useCallback(() => {
    Alert.alert('Ayasofya', 'Sürüm 1.0.0\n\nİslami namaz vakitleri uygulaması.', [
      { text: 'Tamam' },
    ]);
  }, []);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.header}>AYARLAR</Text>

          {/* Location */}
          <Text style={styles.sectionTitle}>KONUM</Text>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleCitySelect}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="location-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>Şehir</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{selectedCity}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </Pressable>

          {/* Notifications */}
          <Text style={styles.sectionTitle}>BİLDİRİMLER</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>Ezan Bildirimleri</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#333', true: colors.accentSoft }}
              thumbColor={notificationsEnabled ? colors.accent : '#888'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="volume-high-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>Ezan Sesi</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#333', true: colors.accentSoft }}
              thumbColor={soundEnabled ? colors.accent : '#888'}
            />
          </View>

          {/* About */}
          <Text style={styles.sectionTitle}>HAKKINDA</Text>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleAbout}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>Uygulama Hakkında</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() =>
              Alert.alert('Değerlendirin', 'Bu özellik henüz eklenmedi.', [{ text: 'Tamam' }])
            }
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="star-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>Uygulamayı Değerlendirin</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  header: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 44,
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
    padding: 16,
    marginBottom: 8,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  rowValue: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
