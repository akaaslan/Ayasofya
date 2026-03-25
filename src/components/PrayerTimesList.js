import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { PrayerTimeRow } from './PrayerTimeRow';
import { useI18n } from '../context/I18nContext';

/**
 * Scrollable list of prayer times.
 * Receives computed prayers array + the active index from the hook.
 */
export function PrayerTimesList({ prayers, activeIndex }) {
  const { t } = useI18n();
  const handlePress = (key) => {
    const prayer = prayers.find((p) => p.key === key);
    if (prayer) {
      Alert.alert(prayer.label, `Vakit: ${prayer.time}`, [{ text: t.ok }]);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {prayers.map((item, index) => (
        <PrayerTimeRow
          key={item.key}
          prayerKey={item.key}
          label={item.label}
          time={item.time}
          active={index === activeIndex}
          onPress={handlePress}
        />
      ))}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 4,
  },
  spacer: {
    height: 8,
  },
});
