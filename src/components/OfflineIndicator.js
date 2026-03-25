import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

export function OfflineIndicator() {
  useTheme();
  const { t } = useI18n();
  const styles = createStyles();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t.offlineWarning}</Text>
    </View>
  );
}

const createStyles = () => ({
  container: {
    backgroundColor: 'rgba(200, 80, 60, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginHorizontal: 18,
    marginBottom: 6,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
