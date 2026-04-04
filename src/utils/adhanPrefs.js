/**
 * Adhan (ezan) preference storage.
 * Saves/loads the selected adhan ID from AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADHAN_LIST, DEFAULT_ADHAN_ID } from '../data/adhanData';

const STORAGE_KEY = 'selected_adhan_id';

/**
 * Get the selected adhan ID.
 * @returns {Promise<string>}
 */
export async function getSelectedAdhanId() {
  try {
    const id = await AsyncStorage.getItem(STORAGE_KEY);
    if (id && ADHAN_LIST.some(a => a.id === id)) return id;
    return DEFAULT_ADHAN_ID;
  } catch {
    return DEFAULT_ADHAN_ID;
  }
}

/**
 * Save the selected adhan ID.
 * @param {string} id
 */
export async function setSelectedAdhanId(id) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {
    // silent
  }
}

/**
 * Get the full adhan object for the selected ID.
 * @returns {Promise<object>}
 */
export async function getSelectedAdhan() {
  const id = await getSelectedAdhanId();
  return ADHAN_LIST.find(a => a.id === id) || ADHAN_LIST[0];
}
