import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@ayasofya_fasting_tracker';

// Data shape: { "2026-02-18": { suhoor: true, iftar: true }, ... }

async function getData() {
  const v = await AsyncStorage.getItem(KEY);
  return v ? JSON.parse(v) : {};
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getTodayFasting() {
  const data = await getData();
  const key = todayKey();
  return data[key] || { suhoor: false, iftar: false };
}

export async function toggleSuhoor() {
  const data = await getData();
  const key = todayKey();
  if (!data[key]) data[key] = { suhoor: false, iftar: false };
  data[key].suhoor = !data[key].suhoor;
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
  return data[key];
}

export async function toggleIftar() {
  const data = await getData();
  const key = todayKey();
  if (!data[key]) data[key] = { suhoor: false, iftar: false };
  data[key].iftar = !data[key].iftar;
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
  return data[key];
}

export async function getFastingStats() {
  const data = await getData();
  const entries = Object.values(data);
  const totalDays = entries.length;
  const fullFastDays = entries.filter((e) => e.suhoor && e.iftar).length;
  return { totalDays, fullFastDays };
}
