import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import { useTheme } from '../context/ThemeContext';
import { DuaCollectionScreen } from '../screens/DuaCollectionScreen';
import { EsmaScreen } from '../screens/EsmaScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { KazaNamazScreen } from '../screens/KazaNamazScreen';
import { NamazTakipScreen } from '../screens/NamazTakipScreen';
import { QuranScreen } from '../screens/QuranScreen';
import { colors } from '../theme/colors';

const Stack = createStackNavigator();

/**
 * iOS-style card transition:
 * Both screens visible during push/pop, previous screen shifts left + dims,
 * swipe-back gesture enabled.
 */
const getScreenOptions = () => ({
  headerShown: false,
  cardStyle: { backgroundColor: colors.backgroundTop },
  ...TransitionPresets.SlideFromRightIOS,
  gestureEnabled: true,
  gestureResponseDistance: 50,
});

export function HomeStack() {
  useTheme();
  const screenOptions = getScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="NamazTakip" component={NamazTakipScreen} />
      <Stack.Screen name="Quran" component={QuranScreen} />
      <Stack.Screen name="Esma" component={EsmaScreen} />
      <Stack.Screen name="DuaCollection" component={DuaCollectionScreen} />
      <Stack.Screen name="KazaNamaz" component={KazaNamazScreen} />
    </Stack.Navigator>
  );
}
