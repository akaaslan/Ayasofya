import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { useI18n, LANGUAGE_LIST } from '../context/I18nContext';
import { useLocationContext } from '../context/LocationContext';
import { useTheme, THEME_LIST } from '../context/ThemeContext';
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
import { getDhikrStyle, saveDhikrStyle } from '../utils/dhikrStylePref';
import {
  getHapticEnabled, setHapticEnabled,
  getTapSoundEnabled, setTapSoundEnabled,
  getFontSize, setFontSize,
  getDhikrTarget, setDhikrTarget,
  getKazaReminderEnabled, setKazaReminderEnabled,
} from '../utils/preferences';
import { exportBackup, importBackup } from '../utils/backup';

export function SettingsScreen({ holidayBannerEnabled, onToggleHolidayBanner }) {
  const { lat, lng, tz, city, district, loading: locLoading, refresh, setManualCity } = useLocationContext();
  const { t, lang, changeLanguage } = useI18n();
  const { theme, themeKey, changeTheme } = useTheme();
  const styles = createStyles();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [ezanPlaying, setEzanPlaying] = useState(false);
  const [preNotification, setPreNotification] = useState(false);

  /* ── Per-prayer notification toggles ── */
  const [prayerToggles, setPrayerToggles] = useState({
    imsak: true, gunes: true, ogle: true, ikindi: true, aksam: true, yatsi: true,
  });

  /* ── Ramadan from context ── */
  const { ramadan, override, setOverride } = useRamadan();

  /* ── Dhikr style preference ── */
  const [dhikrStyle, setDhikrStyle] = useState('tasbih');
  const [hapticEnabled, setHaptic] = useState(true);
  const [tapSoundEnabled, setTapSound] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(1);
  const [dhikrTarget, setDhikrTargetVal] = useState(33);
  const [kazaReminder, setKazaReminder] = useState(false);
  
  useFocusEffect(
    useCallback(() => {
      getDhikrStyle().then(setDhikrStyle);
      getHapticEnabled().then(setHaptic);
      getTapSoundEnabled().then(setTapSound);
      getFontSize().then(setFontSizeLevel);
      getDhikrTarget().then(setDhikrTargetVal);
      getKazaReminderEnabled().then(setKazaReminder);
    }, [])
  );

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

  /* ── Save prefs (debounced from schedule) ── */
  useEffect(() => {
    saveNotificationPrefs({
      enabled: notificationsEnabled,
      soundEnabled,
      preNotification,
      prayers: prayerToggles,
    });
  }, [notificationsEnabled, soundEnabled, preNotification, prayerToggles]);

  /* ── Schedule/cancel notifications when toggled (debounced) ── */
  const scheduleTimer = useRef(null);
  useEffect(() => {
    if (scheduleTimer.current) clearTimeout(scheduleTimer.current);
    scheduleTimer.current = setTimeout(() => {
      if (notificationsEnabled && lat && lng) {
        schedulePrayerNotifications(lat, lng, tz, prayerToggles, preNotification);
      } else {
        cancelAllPrayerNotifications();
      }
    }, 800);
    return () => { if (scheduleTimer.current) clearTimeout(scheduleTimer.current); };
  }, [notificationsEnabled, lat, lng, tz, prayerToggles, preNotification]);

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

  const handleExportBackup = useCallback(async () => {
    try {
      await exportBackup();
    } catch {
      showDialog('alert-circle', t.commonError || 'Hata', t.backupExportFail || 'Yedek dosyası oluşturulamadı.');
    }
  }, [showDialog, t]);

  const handleImportBackup = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(uri);
      const { counts } = await importBackup(content);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      showDialog('checkmark-circle', t.backupRestored || 'Geri Yüklendi', `${total} ${t.backupRecords || 'kayıt geri yüklendi.'}`);
    } catch {
      showDialog('alert-circle', t.commonError || 'Hata', t.backupImportFail || 'Yedek dosyası okunamadı.');
    }
  }, [showDialog, t]);

  const handleDhikrTargetChange = useCallback((val) => {
    setDhikrTargetVal(val);
    setDhikrTarget(val);
  }, []);

  const PRAYER_LABELS = {
    imsak: 'İmsak', gunes: 'Güneş', ogle: 'Öğle', ikindi: 'İkindi', aksam: 'Akşam', yatsi: 'Yatsı',
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.header}>{t.settingsTitle || 'AYARLAR'}</Text>

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
          <Text style={styles.sectionTitle}>{t.ramadanMode || 'RAMAZAN MODU'}</Text>
          <View style={styles.ramadanToggleGroup}>
            {[
              { key: 'auto', label: t.ramadanAuto || 'Otomatik', desc: t.ramadanAutoDesc || 'Takvime göre' },
              { key: 'on', label: t.ramadanOn || 'Açık', desc: t.ramadanOnDesc || 'Her zaman göster' },
              { key: 'off', label: t.ramadanOff || 'Kapalı', desc: t.ramadanOffDesc || 'Gizle' },
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

          {/* Dhikr Style */}
          <Text style={styles.sectionTitle}>{t.dhikrStyle || 'ZİKİRMATİK GÖRÜNÜMÜ'}</Text>
          <View style={styles.ramadanToggleGroup}>
            {[
              { key: 'classic', label: t.dhikrClassic || 'Klasik', desc: t.dhikrClassicDesc || 'Halka tasarım' },
              { key: 'tasbih', label: t.dhikrTasbih || 'Tesbih', desc: t.dhikrTasbihDesc || 'Boncuk halka' },
            ].map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.ramadanToggleBtn,
                  dhikrStyle === opt.key && styles.ramadanToggleBtnActive,
                ]}
                onPress={() => { setDhikrStyle(opt.key); saveDhikrStyle(opt.key); }}
              >
                <Text style={[
                  styles.ramadanToggleLabel,
                  dhikrStyle === opt.key && styles.ramadanToggleLabelActive,
                ]}>{opt.label}</Text>
                <Text style={[
                  styles.ramadanToggleDesc,
                  dhikrStyle === opt.key && styles.ramadanToggleDescActive,
                ]}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Language */}
          <Text style={styles.sectionTitle}>{t.language || 'DİL'}</Text>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setLangModalVisible(true)}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="language-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.selectLanguage || 'Uygulama Dili'}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {LANGUAGE_LIST.find((l) => l.code === lang)?.flag}{' '}
                {LANGUAGE_LIST.find((l) => l.code === lang)?.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </Pressable>

          {/* Theme */}
          <Text style={styles.sectionTitle}>{t.theme || 'TEMA'}</Text>
          <View style={styles.themeGrid}>
            {THEME_LIST.map((item) => (
              <Pressable
                key={item.key}
                style={[
                  styles.themeChip,
                  themeKey === item.key && { borderColor: colors.accent },
                ]}
                onPress={() => changeTheme(item.key)}
              >
                <View style={[styles.themeCircle, { backgroundColor: item.color }]}>
                  {themeKey === item.key && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={[
                  styles.themeLabel,
                  themeKey === item.key && { color: colors.accent },
                ]}>
                  {t[`theme_${item.key}`] || item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Location */}
          <Text style={styles.sectionTitle}>{t.locationSection || 'KONUM'}</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationCoords}>
              {lat.toFixed(4)}°, {lng.toFixed(4)}°
            </Text>
            <Text style={styles.locationNote}>
              {t.locationNote || 'Namaz vakitleri tam GPS koordinatlarınıza göre hesaplanır'}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setCityModalVisible(true)}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="location-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.city || 'Şehir'}</Text>
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
              <Text style={styles.rowLabel}>{t.gpsRefresh || 'GPS ile Konum Al'}</Text>
            </View>
            <View style={styles.rowRight}>
              {locLoading ? (
                <Text style={styles.rowHint}>{t.searching || 'Aranıyor...'}</Text>
              ) : (
                <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
              )}
            </View>
          </Pressable>

          {/* Notifications */}
          <Text style={styles.sectionTitle}>{t.notificationsSection || 'BİLDİRİMLER'}</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.prayerNotifications || 'Ezan Bildirimleri'}</Text>
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
                  <Text style={styles.subRowLabel}>{t[key] || PRAYER_LABELS[key]}</Text>
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
                  <Text style={styles.subRowLabel}>{t.preNotification || 'Ön Bildirim (15 dk önce)'}</Text>
                  <Text style={styles.subRowHint}>{t.preNotificationHint || 'Ezan vaktinden önce hatırlatır'}</Text>
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
          <Text style={styles.sectionTitle}>{t.soundSection || 'EZAN SESİ'}</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="volume-high-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.ezanSound || 'Ezan Sesi'}</Text>
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
              <Text style={styles.rowLabel}>{ezanPlaying ? (t.stopEzan || 'Ezanı Durdur') : (t.testEzan || 'Ezan Sesini Test Et')}</Text>
            </View>
            <Ionicons name={ezanPlaying ? 'stop' : 'play'} size={18} color={colors.textSecondary} />
          </Pressable>

          {/* Holiday Banner */}
          <Text style={styles.sectionTitle}>{t.holidaySection || 'DİNİ BAYRAM SAYACI'}</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="star-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.holidayCountdown || 'Bayram Geri Sayımı'}</Text>
            </View>
            <Switch
              value={holidayBannerEnabled}
              onValueChange={onToggleHolidayBanner}
              trackColor={{ false: '#333', true: colors.accentSoft }}
              thumbColor={holidayBannerEnabled ? colors.accent : '#888'}
            />
          </View>

          {/* Dhikr Settings */}
          <Text style={styles.sectionTitle}>{t.dhikrSettings || 'ZİKİR AYARLARI'}</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="flag-outline" size={20} color={colors.accent} />
              <View>
                <Text style={styles.rowLabel}>{t.dhikrTargetLabel || 'Zikir Hedefi'}</Text>
                <Text style={styles.subRowHint}>{t.dhikrTargetHint || 'Her çevrim için hedef sayı'}</Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Pressable onPress={() => handleDhikrTargetChange(Math.max(10, dhikrTarget - 1))} style={styles.stepBtn}>
                <Ionicons name="remove" size={18} color={colors.accent} />
              </Pressable>
              <Text style={styles.rowValue}>{dhikrTarget}</Text>
              <Pressable onPress={() => handleDhikrTargetChange(dhikrTarget + 1)} style={styles.stepBtn}>
                <Ionicons name="add" size={18} color={colors.accent} />
              </Pressable>
            </View>
          </View>

          {/* General */}
          <Text style={styles.sectionTitle}>{t.generalSettings || 'GENEL'}</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.haptic || 'Titreşim Geri Bildirimi'}</Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={(v) => { setHaptic(v); setHapticEnabled(v); }}
              trackColor={{ false: '#333', true: colors.accentSoft }}
              thumbColor={hapticEnabled ? colors.accent : '#888'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="musical-note-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.tapSound || 'Zikir Dokunma Sesi'}</Text>
            </View>
            <Switch
              value={tapSoundEnabled}
              onValueChange={(v) => { setTapSound(v); setTapSoundEnabled(v); }}
              trackColor={{ false: '#333', true: colors.accentSoft }}
              thumbColor={tapSoundEnabled ? colors.accent : '#888'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="text-outline" size={20} color={colors.accent} />
              <View>
                <Text style={styles.rowLabel}>{t.fontSize || 'Yazı Boyutu (Arapça)'}</Text>
                <Text style={styles.subRowHint}>
                  {[t.fontSmall || 'Küçük', t.fontNormal || 'Normal', t.fontLarge || 'Büyük'][fontSizeLevel]}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Pressable onPress={() => { const v = Math.max(0, fontSizeLevel - 1); setFontSizeLevel(v); setFontSize(v); }} style={styles.stepBtn}>
                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>A</Text>
              </Pressable>
              <Pressable onPress={() => { const v = Math.min(2, fontSizeLevel + 1); setFontSizeLevel(v); setFontSize(v); }} style={styles.stepBtn}>
                <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '700' }}>A</Text>
              </Pressable>
            </View>
          </View>

          {/* Kaza Reminder */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="alarm-outline" size={20} color={colors.accent} />
              <View>
                <Text style={styles.rowLabel}>{t.kazaReminder || 'Kaza Hatırlatma'}</Text>
                <Text style={styles.subRowHint}>{t.kazaReminderHint || 'Vakit sonrası "Kıldınız mı?" bildirimi'}</Text>
              </View>
            </View>
            <Switch
              value={kazaReminder}
              onValueChange={(v) => { setKazaReminder(v); setKazaReminderEnabled(v); }}
              trackColor={{ false: '#333', true: colors.accentSoft }}
              thumbColor={kazaReminder ? colors.accent : '#888'}
            />
          </View>

          {/* Backup/Restore */}
          <Text style={styles.sectionTitle}>{t.backupSection || 'VERİ YEDEKLERİ'}</Text>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleExportBackup}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.backupExport || 'Verileri Yedekle'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleImportBackup}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="cloud-download-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.backupImport || 'Yedekten Geri Yükle'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>

          {/* About */}
          <Text style={styles.sectionTitle}>{t.aboutSection || 'HAKKINDA'}</Text>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleAbout}
            accessibilityRole="button"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.rowLabel}>{t.about || 'Uygulama Hakkında'}</Text>
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
              <Text style={styles.rowLabel}>{t.rateApp || 'Uygulamayı Değerlendirin'}</Text>
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
            <Text style={styles.modalTitle}>{t.selectCity || 'Şehir Seçin'}</Text>
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
              <Text style={styles.modalCloseText}>{t.cancel || 'İptal'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.selectLanguage || 'Dil Seçin'}</Text>
            <FlatList
              data={LANGUAGE_LIST}
              keyExtractor={(item) => item.code}
              style={styles.cityList}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.cityRow,
                    item.code === lang && styles.cityRowActive,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => { changeLanguage(item.code); setLangModalVisible(false); }}
                >
                  <Text style={[styles.cityText, item.code === lang && styles.cityTextActive]}>
                    {item.flag}  {item.label}
                  </Text>
                  {item.code === lang && (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  )}
                </Pressable>
              )}
            />
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setLangModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>{t.commonCancel || 'İptal'}</Text>
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

const createStyles = () => ({
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

  /* Theme grid */
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  themeChip: {
    alignItems: 'center',
    width: '30%',
    paddingVertical: 12,
    backgroundColor: 'rgba(10, 38, 34, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(133, 158, 116, 0.12)',
  },
  themeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  themeLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  /* Step button (for dhikr target, font size) */
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(200, 161, 90, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
