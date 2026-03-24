import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { HolidayBanner } from '../components/HolidayBanner';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { DualarScreen } from '../screens/DualarScreen';
import { QiblaScreen } from '../screens/QiblaScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HomeStack } from './HomeStack';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Qibla: { focused: 'compass', unfocused: 'compass-outline' },
  Dualar: { focused: 'radio-button-on', unfocused: 'radio-button-off-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

export function AppNavigator() {
  useTheme();
  const styles = createStyles();
  const [holidayBannerEnabled, setHolidayBannerEnabled] = useState(true);
  const [holidayBannerDismissed, setHolidayBannerDismissed] = useState(false);

  const showBanner = holidayBannerEnabled && !holidayBannerDismissed;

  const handleCloseBanner = useCallback(() => {
    setHolidayBannerDismissed(true);
  }, []);

  const handleToggleHolidayBanner = useCallback((val) => {
    setHolidayBannerEnabled(val);
    if (val) setHolidayBannerDismissed(false); // re-show when re-enabled
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.navInactive,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name];
            const iconName = focused ? icons.focused : icons.unfocused;
            return <Ionicons name={iconName} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{ tabBarLabel: 'Ana Sayfa' }}
        />
        <Tab.Screen
          name="Qibla"
          component={QiblaScreen}
          options={{ tabBarLabel: 'Kıble' }}
        />
        <Tab.Screen
          name="Dualar"
          component={DualarScreen}
          options={{ tabBarLabel: 'Zikirmatik' }}
        />
        <Tab.Screen
          name="Settings"
          options={{ tabBarLabel: 'Ayarlar' }}
        >
          {() => (
            <SettingsScreen
              holidayBannerEnabled={holidayBannerEnabled}
              onToggleHolidayBanner={handleToggleHolidayBanner}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Holiday countdown banner — above tab bar */}
      <HolidayBanner visible={showBanner} onClose={handleCloseBanner} />
    </View>
  );
}

const createStyles = () => ({
  tabBar: {
    backgroundColor: 'rgba(8, 30, 26, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(133, 158, 116, 0.12)',
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    position: 'absolute',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
