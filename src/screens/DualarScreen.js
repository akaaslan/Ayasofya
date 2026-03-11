import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { ClassicDhikr } from '../components/dhikr/ClassicDhikr';
import { DigitalDhikr } from '../components/dhikr/DigitalDhikr';
import { TasbihDhikr } from '../components/dhikr/TasbihDhikr';
import { ScreenBackground } from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import { getDhikrStyle } from '../utils/dhikrStylePref';

export function DualarScreen() {
  const [style, setStyle] = useState('tasbih');

  useFocusEffect(
    useCallback(() => {
      getDhikrStyle().then(setStyle);
    }, [])
  );

  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeHeader, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideHeader, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const TITLES = { classic: 'Z\u0130K\u0130RMAT\u0130K', tasbih: 'TESB\u0130H', digital: 'D\u0130J\u0130TAL Z\u0130K\u0130R' };

  return (
    <ScreenBackground>
      <SafeAreaView style={s.safe}>
        <Animated.Text style={[s.header, { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }]}>
          {TITLES[style] || 'Z\u0130K\u0130RMAT\u0130K'}
        </Animated.Text>

        {style === 'classic' && <ClassicDhikr />}
        {style === 'tasbih' && <TasbihDhikr />}
        {style === 'digital' && <DigitalDhikr />}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 36,
    marginBottom: 4,
  },
});
