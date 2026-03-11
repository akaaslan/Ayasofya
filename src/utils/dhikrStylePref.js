import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dhikr_style';

/** @type {'classic' | 'tasbih' | 'digital'} */
const DEFAULT_STYLE = 'tasbih';

export async function getDhikrStyle() {
  try {
    const val = await AsyncStorage.getItem(KEY);
    if (val === 'classic' || val === 'tasbih' || val === 'digital') return val;
    return DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
}

export async function saveDhikrStyle(style) {
  try {
    await AsyncStorage.setItem(KEY, style);
  } catch {
    // silent
  }
}
