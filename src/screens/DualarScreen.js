import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ClassicDhikr } from '../components/dhikr/ClassicDhikr';
import { TasbihDhikr } from '../components/dhikr/TasbihDhikr';
import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import { getDhikrStyle, saveDhikrStyle } from '../utils/dhikrStylePref';

export function DualarScreen() {
  const [style, setStyle] = useState('tasbih');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    getDhikrStyle().then(s => {
      if (s === 'digital') {
        setStyle('tasbih');
        saveDhikrStyle('tasbih');
      } else {
        setStyle(s);
      }
    });
  }, []);

  const changeStyle = async (newStyle) => {
    setStyle(newStyle);
    await saveDhikrStyle(newStyle);
    setModalVisible(false);
  };

  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeHeader, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const TITLES = { classic: 'Z\u0130K\u0130RMAT\u0130K', tasbih: 'TESB\u0130H' };

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
            {TITLES[style] || 'Z\u0130K\u0130RMAT\u0130K'}
          </Animated.Text>
          
          <View style={{ width: 40 }} /> 
        </View>

        {style === 'classic' && <ClassicDhikr />}
        {style === 'tasbih' && <TasbihDhikr />}

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setModalVisible(false)}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>GÖRÜNÜM SEÇ</Text>
              
              <TouchableOpacity style={[s.option, style === 'tasbih' && s.optionActive]} onPress={() => changeStyle('tasbih')}>
                <Ionicons name="radio-button-on" size={24} color={style === 'tasbih' ? colors.accent : colors.textMuted} />
                <View style={s.optionInfo}>
                  <Text style={[s.optionLabel, style === 'tasbih' && s.optionLabelActive]}>Tesbih Modu</Text>
                  <Text style={s.optionDesc}>Geleneksel boncuk deneyimi</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[s.option, style === 'classic' && s.optionActive]} onPress={() => changeStyle('classic')}>
                <Ionicons name="color-filter-outline" size={24} color={style === 'classic' ? colors.accent : colors.textMuted} />
                <View style={s.optionInfo}>
                  <Text style={[s.optionLabel, style === 'classic' && s.optionLabelActive]}>Klasik Mod</Text>
                  <Text style={s.optionDesc}>Sade mekanik zikirmatik</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
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
    fontSize: 14,
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
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '700',
  },
  optionLabelActive: {
    color: colors.accent,
  },
  optionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
