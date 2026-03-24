import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

/**
 * Top header: displays the category label (e.g. "BUGÜNÜN VAKİTLERİ"),
 * Hijri day name (e.g. "14 RAMAZAN"), and a pressable calendar button.
 */
export function HeaderSection({ title, dayName }) {
  useTheme();
  const styles = createStyles();
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.day}>{dayName}</Text>
      </View>
    </View>
  );
}

const createStyles = () => ({
  container: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 6,
  },
  day: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  calendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: 'rgba(16, 49, 44, 0.9)',
  },
  calendarBtnPressed: {
    opacity: 0.6,
    backgroundColor: 'rgba(16, 49, 44, 1)',
  },
});
