import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  haptic: '@ayasofya_haptic',
  tapSound: '@ayasofya_tap_sound',
  fontSize: '@ayasofya_font_size',
  dhikrTarget: '@ayasofya_dhikr_target',
  kazaReminder: '@ayasofya_kaza_reminder',
};

export async function getHapticEnabled() {
  const v = await AsyncStorage.getItem(KEYS.haptic);
  return v !== 'false'; // default true
}

export async function setHapticEnabled(enabled) {
  await AsyncStorage.setItem(KEYS.haptic, String(enabled));
}

export async function getTapSoundEnabled() {
  const v = await AsyncStorage.getItem(KEYS.tapSound);
  return v === 'true'; // default false
}

export async function setTapSoundEnabled(enabled) {
  await AsyncStorage.setItem(KEYS.tapSound, String(enabled));
}

export async function getFontSize() {
  const v = await AsyncStorage.getItem(KEYS.fontSize);
  return v ? Number(v) : 1; // 0=small, 1=normal, 2=large
}

export async function setFontSize(level) {
  await AsyncStorage.setItem(KEYS.fontSize, String(level));
}

export async function getDhikrTarget() {
  const v = await AsyncStorage.getItem(KEYS.dhikrTarget);
  return v ? Number(v) : 33;
}

export async function setDhikrTarget(target) {
  await AsyncStorage.setItem(KEYS.dhikrTarget, String(target));
}

export async function getKazaReminderEnabled() {
  const v = await AsyncStorage.getItem(KEYS.kazaReminder);
  return v === 'true'; // default false
}

export async function setKazaReminderEnabled(enabled) {
  await AsyncStorage.setItem(KEYS.kazaReminder, String(enabled));
}
