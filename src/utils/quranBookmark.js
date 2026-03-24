import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@ayasofya_quran_bookmark';

export async function getBookmark() {
  const v = await AsyncStorage.getItem(KEY);
  return v ? JSON.parse(v) : null; // { surahId, surahName }
}

export async function setBookmark(surahId, surahName) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ surahId, surahName }));
}

export async function clearBookmark() {
  await AsyncStorage.removeItem(KEY);
}
