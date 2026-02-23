/**
 * Kaza namazı takibi — AsyncStorage ile kalıcı saklama.
 * Her namaz türü için kaza borcu sayısı tutulur.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kaza_namaz_tracking';

const PRAYER_TYPES = ['sabah', 'ogle', 'ikindi', 'aksam', 'yatsi', 'vitir'];

const DEFAULT_DATA = {
  sabah: 0,
  ogle: 0,
  ikindi: 0,
  aksam: 0,
  yatsi: 0,
  vitir: 0,
};

/** Load kaza data from storage */
async function loadKazaData() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

/** Save kaza data */
async function saveKazaData(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silent
  }
}

/**
 * Get all kaza counts.
 * Returns { sabah: N, ogle: N, ikindi: N, aksam: N, yatsi: N, vitir: N }
 */
export async function getKazaCounts() {
  return loadKazaData();
}

/**
 * Increment kaza count for a prayer type.
 */
export async function incrementKaza(prayerKey, amount = 1) {
  const data = await loadKazaData();
  data[prayerKey] = Math.max(0, (data[prayerKey] || 0) + amount);
  await saveKazaData(data);
  return data;
}

/**
 * Decrement kaza count for a prayer type (i.e., prayer was made up).
 */
export async function decrementKaza(prayerKey, amount = 1) {
  const data = await loadKazaData();
  data[prayerKey] = Math.max(0, (data[prayerKey] || 0) - amount);
  await saveKazaData(data);
  return data;
}

/**
 * Set kaza count directly for a prayer type.
 */
export async function setKazaCount(prayerKey, count) {
  const data = await loadKazaData();
  data[prayerKey] = Math.max(0, count);
  await saveKazaData(data);
  return data;
}

/**
 * Get total kaza remaining across all prayer types.
 */
export async function getTotalKaza() {
  const data = await loadKazaData();
  return Object.values(data).reduce((sum, v) => sum + v, 0);
}

/**
 * Reset all kaza counts to zero.
 */
export async function resetAllKaza() {
  await saveKazaData({ ...DEFAULT_DATA });
  return { ...DEFAULT_DATA };
}

export { PRAYER_TYPES };
