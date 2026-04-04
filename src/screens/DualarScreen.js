import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Modal, PanResponder, Pressable, Text, TextInput, TouchableOpacity, View, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ClassicDhikr } from '../components/dhikr/ClassicDhikr';
import { TasbihDhikr } from '../components/dhikr/TasbihDhikr';
import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { getDhikrStyle, saveDhikrStyle } from '../utils/dhikrStylePref';
import { getDailyTotal, getGrandTotal, getDhikrSessions } from '../utils/dhikrStorage';
import { DHIKRS } from '../constants/dhikrs';

export function DualarScreen() {
  const { fontScale } = useTheme();
  const { t = {} } = useI18n() || {};
  const s = createStyles(fontScale);
  const [style, setStyle] = useState('tasbih');
  const [modalVisible, setModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [targets, setTargets] = useState({});
  const [prayerPopupEnabled, setPrayerPopupEnabled] = useState(true);
  const [targetVibrationEnabled, setTargetVibrationEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getDhikrStyle().then(s => {
        if (s === 'digital') {
          setStyle('tasbih');
          saveDhikrStyle('tasbih');
        } else {
          setStyle(s);
        }
      });
      getDailyTotal().then(setDailyTotal);
      getGrandTotal().then(setGrandTotal);
      AsyncStorage.getItem('@ayasofya_dhikr_targets').then(v => {
        setTargets(v ? JSON.parse(v) : {});
      });
      AsyncStorage.getItem('@ayasofya_prayer_popup').then(v => {
        setPrayerPopupEnabled(v !== 'false');
      });
      AsyncStorage.getItem('@ayasofya_target_vib').then(v => {
        setTargetVibrationEnabled(v !== 'false');
      });
    }, [])
  );

  const currentDhikr = DHIKRS[selectedIdx];
  const currentTargetValue = targets[currentDhikr.id];
  const inputValue = currentTargetValue !== undefined ? String(currentTargetValue) : String(currentDhikr.defaultTarget);
  const effectiveTarget = Number(currentTargetValue) || currentDhikr.defaultTarget;

  const handleTargetChange = async (val) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const validNum = cleaned === '' ? '' : parseInt(cleaned, 10);
    const newTargets = { ...targets, [currentDhikr.id]: validNum };
    setTargets(newTargets);
    await AsyncStorage.setItem('@ayasofya_dhikr_targets', JSON.stringify(newTargets));
  };

  const handleTapIncrement = useCallback(() => {
    setDailyTotal(d => d + 1);
    setGrandTotal(g => g + 1);
  }, []);

  const togglePrayerPopup = async (val) => {
    setPrayerPopupEnabled(val);
    await AsyncStorage.setItem('@ayasofya_prayer_popup', String(val));
  };

  const toggleTargetVibration = async (val) => {
    setTargetVibrationEnabled(val);
    await AsyncStorage.setItem('@ayasofya_target_vib', String(val));
  };

  const changeStyle = async (newStyle) => {
    setStyle(newStyle);
    await saveDhikrStyle(newStyle);
    setModalVisible(false);
  };

  const openHistory = useCallback(async () => {
    const rows = await getDhikrSessions();
    setSessions(rows);
    setHistoryVisible(true);
  }, []);

  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;
  const toastAnim = useRef(new Animated.Value(-200)).current;
  const hideTimer = useRef(null);

  const hideToast = useCallback(() => {
    Animated.timing(toastAnim, { toValue: -200, duration: 400, useNativeDriver: true }).start();
  }, [toastAnim]);

  const onTargetReached = useCallback(() => {
    if (!prayerPopupEnabled) return;
    
    if (hideTimer.current) clearTimeout(hideTimer.current);
    
    toastAnim.setValue(-200);
    Animated.timing(toastAnim, { 
      toValue: 50, 
      duration: 600, 
      easing: Easing.out(Easing.back(1.5)), 
      useNativeDriver: true 
    }).start();

    hideTimer.current = setTimeout(() => {
      hideToast();
    }, 4000);
  }, [prayerPopupEnabled, toastAnim, hideToast]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy < 0) {
          toastAnim.setValue(50 + gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -20 || gestureState.vy < -0.5) {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideToast();
        } else {
          Animated.spring(toastAnim, { toValue: 50, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeHeader, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const handleResetRefresh = useCallback(() => {
    getDailyTotal().then(setDailyTotal);
    getGrandTotal().then(setGrandTotal);
  }, []);

  const TITLES = {
    tasbih: t.dhikrTasbih,
    classic: t.dhikrClassic,
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.safe}>
        <View style={s.headerContainer}>
          <TouchableOpacity 
            style={s.styleBtn} 
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={20} color={colors.accent} />
          </TouchableOpacity>

          <Animated.Text style={[s.header, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
            {TITLES[style] || 'ZİKİRMATİK'}
          </Animated.Text>
          
          <TouchableOpacity
            style={s.styleBtn}
            onPress={openHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Daily stats bar */}
        <View style={s.statsBar}>
          <View style={s.statItem}>
            <Text style={s.statNum}>{dailyTotal}</Text>
            <Text style={s.statLabel}>{t.today}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{grandTotal}</Text>
            <Text style={s.statLabel}>{t.total}</Text>
          </View>
        </View>

        {style === 'classic' && <ClassicDhikr selectedIdx={selectedIdx} onSelectDhikr={setSelectedIdx} currentTarget={effectiveTarget} currentDhikr={currentDhikr} dhikrs={DHIKRS} onTargetReached={onTargetReached} targetVibrationEnabled={targetVibrationEnabled} onTap={handleTapIncrement} onReset={handleResetRefresh} count={sessionCount} setCount={setSessionCount} />}
        {style === 'tasbih' && <TasbihDhikr selectedIdx={selectedIdx} onSelectDhikr={setSelectedIdx} currentTarget={effectiveTarget} currentDhikr={currentDhikr} dhikrs={DHIKRS} onTargetReached={onTargetReached} targetVibrationEnabled={targetVibrationEnabled} onTap={handleTapIncrement} onReset={handleResetRefresh} count={sessionCount} setCount={setSessionCount} />}

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setModalVisible(false)}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>{(t.dhikrStyle).toUpperCase()}</Text>
              
              <TouchableOpacity style={[s.option, style === 'tasbih' && s.optionActive]} onPress={() => changeStyle('tasbih')}>
                <Ionicons name="radio-button-on" size={24} color={style === 'tasbih' ? colors.accent : colors.textMuted} />
                <View style={s.optionInfo}>
                  <Text style={[s.optionLabel, style === 'tasbih' && s.optionLabelActive]}>{t.dhikrTasbih}</Text>
                  <Text style={s.optionDesc}>{t.dhikrTasbihDesc}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[s.option, style === 'classic' && s.optionActive]} onPress={() => changeStyle('classic')}>
                <Ionicons name="color-filter-outline" size={24} color={style === 'classic' ? colors.accent : colors.textMuted} />
                <View style={s.optionInfo}>
                  <Text style={[s.optionLabel, style === 'classic' && s.optionLabelActive]}>{t.dhikrClassic}</Text>
                  <Text style={s.optionDesc}>{t.dhikrClassicDesc}</Text>
                </View>
              </TouchableOpacity>
              
              <View style={s.targetSection}>
                <Text style={s.modalTitle}>{t.dhikrTargetLabel}</Text>
                <Text style={s.targetHint}>{t[currentDhikr.id] || currentDhikr.label} {t.forWord}</Text>
                <TextInput
                  style={s.targetInput}
                  keyboardType="numeric"
                  value={inputValue}
                  onChangeText={handleTargetChange}
                  onBlur={() => {
                    if (currentTargetValue === '' || currentTargetValue === 0) handleTargetChange(String(currentDhikr.defaultTarget));
                  }}
                  maxLength={5}
                  returnKeyType="done"
                  cursorColor={colors.accent}
                />
              </View>

              <View style={s.togglesSection}>
                <View style={s.toggleRow}>
                  <Text style={s.toggleLabel}>{t.targetNotification}</Text>
                  <Switch
                    value={prayerPopupEnabled}
                    onValueChange={togglePrayerPopup}
                    trackColor={{ false: '#333', true: colors.accentSoft }}
                    thumbColor={prayerPopupEnabled ? colors.accent : '#888'}
                  />
                </View>
                <View style={[s.toggleRow, { marginTop: 12 }]}>
                  <Text style={s.toggleLabel}>{t.targetVibration}</Text>
                  <Switch
                    value={targetVibrationEnabled}
                    onValueChange={toggleTargetVibration}
                    trackColor={{ false: '#333', true: colors.accentSoft }}
                    thumbColor={targetVibrationEnabled ? colors.accent : '#888'}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Dhikr history modal */}
        <Modal
          visible={historyVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setHistoryVisible(false)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setHistoryVisible(false)}>
            <View style={s.historyContent} onStartShouldSetResponder={() => true}>
              <Text style={s.modalTitle}>{t.dhikrHistory || 'ZİKİR GEÇMİŞİ'}</Text>

              {sessions.length === 0 ? (
                <View style={s.historyEmpty}>
                  <Ionicons name="leaf-outline" size={40} color={colors.textMuted} />
                  <Text style={s.historyEmptyText}>{t.dhikrHistoryEmpty || 'Henüz tamamlanmış zikir yok'}</Text>
                </View>
              ) : (
                <FlatList
                  data={sessions}
                  keyExtractor={(_, i) => String(i)}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 400 }}
                  renderItem={({ item }) => {
                    const dhikr = DHIKRS.find(d => d.id === item.dhikrId);
                    const label = t[item.dhikrId] || dhikr?.label || item.dhikrId;
                    const arabic = dhikr?.arabic || '';
                    return (
                      <View style={s.historyRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.historyLabel}>{label}</Text>
                          {arabic ? <Text style={s.historyArabic}>{arabic}</Text> : null}
                        </View>
                        <View style={s.historyRight}>
                          <Text style={s.historyCount}>{item.count}</Text>
                          <Text style={s.historyDate}>{item.date}</Text>
                        </View>
                      </View>
                    );
                  }}
                />
              )}

              <TouchableOpacity style={s.historyCloseBtn} onPress={() => setHistoryVisible(false)}>
                <Text style={s.historyCloseTxt}>{t.close || 'Kapat'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <Animated.View style={[s.toastContainer, { transform: [{ translateY: toastAnim }] }]} {...panResponder.panHandlers}>
          <View style={s.toastIconWrapper}>
            <Ionicons name="heart" size={24} color={colors.accent} />
          </View>
          <View style={s.toastTextCol}>
            <Text style={s.toastArabic}>اللّٰهُمَّ تَقَبَّلْ مِنَّا</Text>
            <Text style={s.toastMsg}>{t.dhikrAcceptedHint}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const createStyles = (fs = 1) => ({
  safe: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 36,
    marginBottom: 4,
  },
  header: {
    color: colors.textPrimary,
    fontSize: 14 * fs,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    flex: 1,
  },
  styleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(200, 161, 90, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#0a2622',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.3)',
  },
  modalTitle: {
    color: colors.accent,
    fontSize: 12 * fs,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: {
    backgroundColor: 'rgba(200, 161, 90, 0.08)',
    borderColor: 'rgba(200, 161, 90, 0.2)',
  },
  optionInfo: {
    marginLeft: 16,
  },
  optionLabel: {
    color: colors.textSecondary,
    fontSize: 16 * fs,
    fontWeight: '700',
  },
  optionLabelActive: {
    color: colors.accent,
  },
  optionDesc: {
    color: colors.textMuted,
    fontSize: 12 * fs,
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNum: {
    color: colors.accent,
    fontSize: 16 * fs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  targetSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 161, 90, 0.15)',
    alignItems: 'center',
  },
  targetHint: {
    color: colors.textSecondary,
    fontSize: 12 * fs,
    marginBottom: 12,
  },
  targetInput: {
    backgroundColor: 'rgba(200, 161, 90, 0.1)',
    color: colors.accent,
    fontSize: 24 * fs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.3)',
    textAlign: 'center',
    minWidth: 100,
  },
  togglesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 161, 90, 0.15)',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontSize: 14 * fs,
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(10,38,34,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 1000,
  },
  toastIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(200, 161, 90, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  toastTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  toastArabic: {
    color: colors.accent,
    fontSize: 16 * fs,
    fontWeight: '600',
    marginBottom: 4,
  },
  toastMsg: {
    color: colors.textSecondary,
    fontSize: 12 * fs,
    lineHeight: 18,
  },
  historyContent: {
    width: '100%',
    backgroundColor: '#0a2622',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.3)',
    maxHeight: '80%',
  },
  historyEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  historyEmptyText: {
    color: colors.textMuted,
    fontSize: 13 * fs,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 161, 90, 0.1)',
  },
  historyLabel: {
    color: colors.textPrimary,
    fontSize: 14 * fs,
    fontWeight: '600',
  },
  historyArabic: {
    color: colors.textMuted,
    fontSize: 12 * fs,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  historyCount: {
    color: colors.accent,
    fontSize: 18 * fs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 10 * fs,
    marginTop: 2,
  },
  historyCloseBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(200, 161, 90, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.25)',
  },
  historyCloseTxt: {
    color: colors.accent,
    fontSize: 13 * fs,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
