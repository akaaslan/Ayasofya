import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomDialog } from '../components/CustomDialog';
import { ScreenBackground } from '../components/ScreenBackground';
import { useLocationContext } from '../context/LocationContext';
import { CITY_LIST } from '../hooks/useLocation';
import { colors } from '../theme/colors';
import { playEzan, stopEzan, isEzanPlaying } from '../utils/adhanSound';
import {
  cancelAllPrayerNotifications,
  schedulePrayerNotifications,
} from '../utils/notifications';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
} from '../utils/notificationPrefs';
import { useRamadan } from '../context/RamadanContext';

export function SettingsScreen({ holidayBannerEnabled, onToggleHolidayBanner }) {
  const { lat, lng, tz, city, district, loading: locLoading, refresh, setManualCity } = useLocationContext();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [ezanPlaying, setEzanPlaying] = useState(false);
  const [preNotification, setPreNotification] = useState(false);

  /* ── Per-prayer notification toggles ── */
  const [prayerToggles, setPrayerToggles] = useState({
    imsak: true, gunes: true, ogle: true, ikindi: true, aksam: true, yatsi: true,
  });

  /* ── Ramadan from context ── */
  const { ramadan, override, setOverride } = useRamadan();

  /* ── Load notification prefs ── */
  useEffect(() => {
    getNotificationPrefs().then((prefs) => {
      setNotificationsEnabled(prefs.enabled);
      setSoundEnabled(prefs.soundEnabled);
      setPreNotification(prefs.preNotification);
      setPrayerToggles(prefs.prayers);
    });
  }, []);

  /* ── CustomDialog state ── */
  const [dialog, setDialog] = useState({ visible: false, icon: null, title: '', message: '', buttons: [] });
  const showDialog = useCallback((icon, title, message, buttons) => {
    setDialog({ visible: true, icon, title, message, buttons: buttons || [{ text: 'Tamam' }] });
  }, []);
  const hideDialog = useCallback(() => setDialog((d) => ({ ...d, visible: false })), []);

  /* ── Schedule/cancel notifications when toggled ── */
  useEffect(() => {
    if (notificationsEnabled && lat && lng) {
      schedulePrayerNotifications(lat, lng, tz, prayerToggles);
    } else {
      cancelAllPrayerNotifications();
    }
    // Save prefs
    saveNotificationPrefs({
      enabled: notificationsEnabled,
      soundEnabled,
      preNotification,
      prayers: prayerToggles,
    });
  }, [notificationsEnabled, lat, lng, tz, prayerToggles, soundEnabled, preNotification]);

  const handleCitySelect = useCallback((cityName) => {
    setManualCity(cityName);
    setCityModalVisible(false);
  }, [setManualCity]);

  const handleGpsRefresh = useCallback(async () => {
    await refresh();
    const locName = district ? `${district}, ${city}` : city;
    showDialog('location', 'Konum Güncellendi', `GPS konumunuz başarıyla güncellendi:\n${locName}\n\nNamaz vakitleri tam GPS koordinatlarınıza göre hesaplanıyor.`);
  }, [refresh, showDialog, city, district]);

  const handleTogglePrayer = useCallback((key) => {
    setPrayerToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleTestEzan = useCallback(async () => {
    if (ezanPlaying) {
      await stopEzan();
      setEzanPlaying(false);
    } else {
      setEzanPlaying(true);
      const result = await playEzan();
      if (!result) {
        showDialog('volume-mute', 'Hata', 'Ezan sesi çalınamadı. İnternet bağlantınızı kontrol edin.');
        setEzanPlaying(false);
      }
      // Auto-reset after some time
      setTimeout(() => setEzanPlaying(false), 30000);
    }
  }, [ezanPlaying, showDialog]);

  const handleAbout = useCallback(() => {
    showDialog('information-circle', 'Ayasofya', 'Sürüm 1.1.0\n\nİslami namaz vakitleri uygulaması.\n\n• GPS ile hassas namaz vakitleri\n• Esma-ül Hüsna\n• Dua koleksiyonu\n• Ramazan modu\n• Kaza namazı takibi\n• Ezan sesi');
  }, [showDialog]);

  const PRAYER_LABELS = {
    imsak: 'İmsak', gunes: 'Güneş', ogle: 'Öğle', ikindi: 'İkindi', aksam: 'Akşam', yatsi: 'Yatsı',
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.header}>AYARLAR</Text>

          {/* Ramadan indicator */}
          {ramadan.isRamadan && (
            <View style={styles.ramadanIndicator}>
              <Text style={styles.ramadanIndicatorIcon}>☪</Text>
              <Text style={styles.ramadanIndicatorText}>
                Ramazan-ı Şerif{ramadan.dayOfRamadan > 0 ? ` — ${ramadan.dayOfRamadan}. gün / ${ramadan.totalDays}` : ' (Manuel)'}
              </Text>
            </View>
          )}

          {/* Ramadan Mode Toggle */}
          <Text style={styles.sectionTitle}>RAMAZAN MODU</Text>
          <View style={styles.ramadanToggleGroup}>
            {[
              { key: 'auto', label: 'Otomatik', desc: 'Takvime göre' },
              { key: 'on', label: 'Açık', desc: 'Her zaman göster' },
              { key: 'off', label: 'Kapalı', desc: 'Gizle' },
            ].map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.ramadanToggleBtn,
                  override === opt.key && styles.ramadanToggleBtnActive,
                ]}
                onPress={() => setOverride(opt.key)}
              >
                <Text style={[
                  styles.ramadanToggleLabel,
                  override === opt.key && styles.ramadanToggleLabelActive,
                ]}>{opt.label}</Text>
                <Text style={[
                  styles.ramadanToggleDesc,
                  override === opt.key && styles.ramadanToggleDescActive,
                ]}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Location */}
          <Text style={styles.sectionTitle}>KONUM</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationCoords}>
              {lat.toFixed(4)}°, {lng.toFixed(4)}°
            </Text>
            <Text style={styles.locationNote}>
              Namaz vakitleri tam GPS koordinatlarınıza göre hesaplanır
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setCityModalVisible(true)}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="location-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>Şehir</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{district ? `${district}, ${city}` : city}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleGpsRefresh}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="navigate-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>GPS ile Konum Al</Text>
            </View>
            <View style={styles.rowRight}>
              {locLoading ? (
                <Text style={styles.rowHint}>Aranıyor...</Text>
              ) : (
                <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
              )}
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

          {/* Per-prayer toggles */}
          {notificationsEnabled && (
            <View style={styles.subSection}>
              {Object.keys(PRAYER_LABELS).map((key) => (
                <View key={key} style={styles.subRow}>
                  <Text style={styles.subRowLabel}>{PRAYER_LABELS[key]}</Text>
                  <Switch
                    value={prayerToggles[key]}
                    onValueChange={() => handleTogglePrayer(key)}
                    trackColor={{ false: '#333', true: colors.accentSoft }}
                    thumbColor={prayerToggles[key] ? colors.accent : '#888'}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              ))}

              {/* Pre-notification */}
              <View style={[styles.subRow, { marginTop: 8 }]}>
                <View>
                  <Text style={styles.subRowLabel}>Ön Bildirim (15 dk önce)</Text>
                  <Text style={styles.subRowHint}>Ezan vaktinden önce hatırlatır</Text>
                </View>
                <Switch
                  value={preNotification}
                  onValueChange={setPreNotification}
                  trackColor={{ false: '#333', true: colors.accentSoft }}
                  thumbColor={preNotification ? colors.accent : '#888'}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
          )}

          {/* Sound */}
          <Text style={styles.sectionTitle}>EZAN SESİ</Text>
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

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleTestEzan}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name={ezanPlaying ? 'stop-circle' : 'play-circle'} size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{ezanPlaying ? 'Ezanı Durdur' : 'Ezan Sesini Test Et'}</Text>
            </View>
            <Ionicons name={ezanPlaying ? 'stop' : 'play'} size={18} color={colors.textSecondary} />
          </Pressable>

          {/* Holiday Banner */}
          <Text style={styles.sectionTitle}>DİNİ BAYRAM SAYACI</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="star-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>Bayram Geri Sayımı</Text>
            </View>
            <Switch
              value={holidayBannerEnabled}
              onValueChange={onToggleHolidayBanner}
              trackColor={{ false: '#333', true: colors.accentSoft }}
              thumbColor={holidayBannerEnabled ? colors.accent : '#888'}
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
              showDialog('star', 'Değerlendirin', 'Bu özellik henüz eklenmedi.')
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

      {/* City Selector Modal */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Şehir Seçin</Text>
            <FlatList
              data={CITY_LIST}
              keyExtractor={(item) => item}
              style={styles.cityList}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.cityRow,
                    item === city && styles.cityRowActive,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => handleCitySelect(item)}
                >
                  <Text
                    style={[
                      styles.cityText,
                      item === city && styles.cityTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === city && (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  )}
                </Pressable>
              )}
            />
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setCityModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>İptal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CustomDialog */}
      <CustomDialog
        visible={dialog.visible}
        icon={dialog.icon}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onClose={hideDialog}
      />
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
  rowHint: {
    color: colors.textMuted,
    fontSize: 12,
  },

  /* Ramadan indicator */
  ramadanIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.25)',
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  ramadanIndicatorIcon: {
    fontSize: 16,
    color: colors.accent,
  },
  ramadanIndicatorText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Location info */
  locationInfo: {
    backgroundColor: 'rgba(10, 38, 34, 0.50)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  locationCoords: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    marginBottom: 2,
  },
  locationNote: {
    color: colors.textMuted,
    fontSize: 10,
  },

  /* Sub-section (per-prayer toggles) */
  subSection: {
    backgroundColor: 'rgba(10, 38, 34, 0.60)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  subRowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  subRowHint: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },

  /* City modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 18,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  cityList: {
    paddingHorizontal: 16,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  cityRowActive: {
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    borderRadius: 10,
  },
  cityText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  cityTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: 'rgba(200, 161, 90, 0.12)',
    borderRadius: 12,
  },
  modalCloseText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },

  /* Ramadan toggle group */
  ramadanToggleGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  ramadanToggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
  },
  ramadanToggleBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(200, 161, 90, 0.10)',
  },
  ramadanToggleLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  ramadanToggleLabelActive: {
    color: colors.accent,
  },
  ramadanToggleDesc: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  ramadanToggleDescActive: {
    color: colors.accentSoft,
  },
});
