import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import {
  getTodayFasting,
  toggleSuhoor,
  toggleIftar,
  getFastingStats,
} from '../utils/fastingTracker';

export function FastingTracker() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [today, setToday] = useState({ suhoor: false, iftar: false });
  const [stats, setStats] = useState({ totalDays: 0, fullFastDays: 0 });

  const loadData = useCallback(async () => {
    const [t, s] = await Promise.all([getTodayFasting(), getFastingStats()]);
    setToday(t);
    setStats(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSuhoor = async () => {
    const updated = await toggleSuhoor();
    setToday(updated);
    const s = await getFastingStats();
    setStats(s);
  };

  const handleIftar = async () => {
    const updated = await toggleIftar();
    setToday(updated);
    const s = await getFastingStats();
    setStats(s);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.panel, borderColor: theme.divider }]}>
      <View style={styles.header}>
        <Ionicons name="moon" size={18} color={theme.accent} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t.fastingTracker || 'Oruç Takibi'}</Text>
        <Text style={[styles.statsText, { color: theme.textMuted }]}>
          {t.fullFastDaysDesc ? t.fullFastDaysDesc.replace('{days}', stats.fullFastDays) : `${stats.fullFastDays} gün tam oruç`}
        </Text>
      </View>

      <View style={styles.row}>
        <Pressable
          style={[
            styles.btn,
            { borderColor: theme.divider },
            today.suhoor && { backgroundColor: 'rgba(200, 161, 90, 0.15)', borderColor: theme.accent },
          ]}
          onPress={handleSuhoor}
        >
          <Ionicons
            name={today.suhoor ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={today.suhoor ? theme.accent : theme.textMuted}
          />
          <Text style={[styles.btnText, { color: today.suhoor ? theme.accent : theme.textSecondary }]}>
            {t.sahurBtn || 'Sahur'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.btn,
            { borderColor: theme.divider },
            today.iftar && { backgroundColor: 'rgba(200, 161, 90, 0.15)', borderColor: theme.accent },
          ]}
          onPress={handleIftar}
        >
          <Ionicons
            name={today.iftar ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={today.iftar ? theme.accent : theme.textMuted}
          />
          <Text style={[styles.btnText, { color: today.iftar ? theme.accent : theme.textSecondary }]}>
            {t.iftarBtn || 'İftar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
