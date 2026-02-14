import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo } from 'react';
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native';

import { CountdownRing } from '../components/CountdownRing';
import { HeaderSection } from '../components/HeaderSection';
import { PrayerTimesList } from '../components/PrayerTimesList';
import { ScreenBackground } from '../components/ScreenBackground';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { getHijriDisplayString } from '../utils/hijriDate';

// Istanbul defaults
const LAT = 41.0082;
const LNG = 28.9784;
const TZ = 3;

/** Turkish dative-case forms for each prayer key → "{prayer}…YE/A KALAN" */
const DATIVE = {
  imsak:  'İmsaka',
  gunes:  'Güneşe',
  ogle:   'Öğleye',
  ikindi: 'İkindiye',
  aksam:  'Akşama',
  yatsi:  'Yatsıya',
};

export function HomeScreen() {
  const clock = useCurrentTime();
  const { prayers, nextPrayer, activeIndex, countdown } = usePrayerTimes(LAT, LNG, TZ);

  const hijriDay = useMemo(() => getHijriDisplayString(new Date()), []);

  // Current prayer = the one we're "in" (one before the next)
  const currentPrayerName = activeIndex > 0
    ? prayers[activeIndex - 1]?.label ?? '—'
    : activeIndex === 0
      ? '—'
      : '—';

  // Dynamic caption: "İKİNDİYE KALAN", "AKŞAMA KALAN" etc.
  const ringCaption = nextPrayer
    ? `${(DATIVE[nextPrayer.key] ?? '').toUpperCase()} KALAN`
    : 'KALAN SÜRE';

  const handleCalendar = useCallback(() => {
    Alert.alert('Takvim', 'Takvim özelliği yakında eklenecek.', [{ text: 'Tamam' }]);
  }, []);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />

        <View style={styles.container}>

          <HeaderSection
            title="BUGÜNÜN VAKİTLERİ"
            dayName={hijriDay}
            onCalendarPress={handleCalendar}
          />

          <CountdownRing
            label="VAKİT İÇİNDE"
            prayerName={currentPrayerName}
            countdown={countdown}
            caption={ringCaption}
          />

          <PrayerTimesList prayers={prayers} activeIndex={activeIndex} />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 8,
  },
  clock: {
    color: '#d4ddd2',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginLeft: 2,
    fontVariant: ['tabular-nums'],
  },
});
