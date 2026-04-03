import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

/** Map each prayer key to an appropriate Ionicon name */
const PRAYER_ICONS = {
  imsak: 'moon-outline',
  gunes: 'sunny-outline',
  ogle: 'sunny',
  ikindi: 'partly-sunny-outline',
  aksam: 'cloudy-night-outline',
  yatsi: 'moon',
};

/**
 * Single prayer-time row.  Pressable — calls `onPress(key)` when tapped.
 * Shows icon, label, time. Highlighted when `active`.
 */
export function PrayerTimeRow({ prayerKey, label, time, active, onPress }) {
  const { fontScale } = useTheme();
  const styles = createStyles();
  const iconName = PRAYER_ICONS[prayerKey] || 'ellipse-outline';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        active && styles.activeRow,
        pressed && styles.pressedRow,
      ]}
      onPress={() => onPress?.(prayerKey)}
      accessibilityLabel={`${label} ${time}`}
      accessibilityRole="button"
    >
      <View style={styles.left}>
        <Ionicons
          name={iconName}
          size={18}
          color={active ? '#f8d287' : colors.textSecondary}
        />
        <Text style={[styles.label, active && styles.activeText, { fontSize: 18 * fontScale }]}>{label}</Text>
      </View>
      {active && (
        <Ionicons name="notifications" size={14} color={colors.accent} style={{ marginRight: 4 }} />
      )}
      <Text style={[styles.time, active && styles.activeTime, { fontSize: (active ? 20 : 18) * fontScale }]}>{time}</Text>
    </Pressable>
  );
}

const createStyles = () => ({
  row: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  activeRow: {
    backgroundColor: colors.activeRow,
    borderWidth: 1,
    borderColor: colors.accentSoft,
  },
  pressedRow: {
    opacity: 0.7,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  time: {
    color: colors.textPrimary,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  activeText: {
    color: '#f8d287',
    fontWeight: '600',
  },
  activeTime: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 20,
  },
});
