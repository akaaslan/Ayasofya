import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationContext } from './src/context/LocationContext';
import { RamadanProvider } from './src/context/RamadanContext';
import { useLocation } from './src/hooks/useLocation';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupNotificationChannel } from './src/utils/notifications';

export default function App() {
  const location = useLocation();

  useEffect(() => {
    setupNotificationChannel();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocationContext.Provider value={location}>
          <RamadanProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </RamadanProvider>
        </LocationContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
