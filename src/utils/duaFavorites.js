import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@ayasofya_dua_favorites';

export async function getDuaFavorites() {
  const v = await AsyncStorage.getItem(KEY);
  return v ? JSON.parse(v) : [];
}

export async function toggleDuaFavorite(duaId) {
  const favs = await getDuaFavorites();
  const idx = favs.indexOf(duaId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(duaId);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(favs));
  return favs;
}
