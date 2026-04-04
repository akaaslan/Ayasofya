import { NavigationContainer } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ToastProvider } from './src/components/Toast';
import { I18nProvider } from './src/context/I18nContext';
import { LocationProvider } from './src/context/LocationContext';
import { RamadanProvider, useRamadan } from './src/context/RamadanContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingScreen, isOnboardingDone } from './src/screens/OnboardingScreen';
import { setupNotificationChannel, requestNotificationPermission, setupNotificationResponseListener } from './src/utils/notifications';
import { registerBackgroundTask } from './src/utils/backgroundService';

/* Bridge: reads Ramadan context and passes to ThemeProvider (must be child of RamadanProvider) */
function RamadanThemeBridge({ children }) {
  const { ramadan } = useRamadan();
  return <ThemeProvider ramadanActive={ramadan.isRamadan}>{children}</ThemeProvider>;
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    setupNotificationChannel();
    requestNotificationPermission();
    setupNotificationResponseListener();
    registerBackgroundTask();
    isOnboardingDone().then((done) => setShowOnboarding(!done));
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

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
            <RamadanThemeBridge>
              <I18nProvider>
                <ToastProvider>
                  {showOnboarding ? (
                    <OnboardingScreen onComplete={handleOnboardingComplete} />
                  ) : (
                    <LocationProvider>
                      <NavigationContainer
                        theme={{
                          dark: true,
                          colors: {
                            primary: '#c8a15a',
                            background: '#061e1a',
                            card: '#061e1a',
                            text: '#f0ead2',
                            border: 'rgba(133, 158, 116, 0.12)',
                            notification: '#c8a15a',
                          },
                          fonts: {
                            regular: { fontFamily: 'System', fontWeight: '400' },
                            medium: { fontFamily: 'System', fontWeight: '500' },
                            bold: { fontFamily: 'System', fontWeight: '700' },
                            heavy: { fontFamily: 'System', fontWeight: '900' },
                          },
                        }}
                      >
                        <AppNavigator />
                      </NavigationContainer>
                    </LocationProvider>
                  )}
                </ToastProvider>
              </I18nProvider>
            </RamadanThemeBridge>
          </RamadanProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
