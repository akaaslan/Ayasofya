import { NavigationContainer } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { I18nProvider } from './src/context/I18nContext';
import { LocationContext } from './src/context/LocationContext';
import { RamadanProvider, useRamadan } from './src/context/RamadanContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { useLocation } from './src/hooks/useLocation';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingScreen, isOnboardingDone } from './src/screens/OnboardingScreen';
import { setupNotificationChannel, requestNotificationPermission } from './src/utils/notifications';

/* Bridge that reads Ramadan state and passes it to ThemeProvider */
function ThemedApp({ children }) {
  const { ramadan } = useRamadan();
  return (
    <ThemeProvider ramadanActive={ramadan.isRamadan}>
      {children}
    </ThemeProvider>
  );
}

export default function App() {
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    setupNotificationChannel();
    requestNotificationPermission();
    isOnboardingDone().then((done) => setShowOnboarding(!done));
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  // Show splash-colored loading screen while checking onboarding state
  if (showOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#061e1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#c8a15a" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <RamadanProvider>
            <ThemedApp>
              <I18nProvider>
                {showOnboarding ? (
                  <OnboardingScreen onComplete={handleOnboardingComplete} />
                ) : (
                  <LocationContext.Provider value={location}>
                    <NavigationContainer>
                      <AppNavigator />
                    </NavigationContainer>
                  </LocationContext.Provider>
                )}
              </I18nProvider>
            </ThemedApp>
          </RamadanProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
