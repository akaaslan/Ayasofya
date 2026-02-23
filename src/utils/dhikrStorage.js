/**
 * Zikirmatik veri saklama — AsyncStorage ile kalıcı.
 * Her zikir türü için toplam sayı ve oturumlar kaydedilir.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dhikr_data';

/**
 * Data structure:
 * {
 *   totals: { subhanallah: 500, elhamdulillah: 300, ... },
 *   sessions: [
 *     { dhikrId: 'subhanallah', count: 33, date: '2026-02-20T10:00:00Z' },
 *     ...
 *   ],
 *   lastSessionDate: '2026-02-20',
 *   dailyTotal: 150,
 * }
 */

async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { totals: {}, sessions: [], lastSessionDate: null, dailyTotal: 0 };
  } catch {
    return { totals: {}, sessions: [], lastSessionDate: null, dailyTotal: 0 };
  }
}

async function saveData(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silent
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Save a completed count for a dhikr type.
 * Called when user taps the counter.
 */
export async function saveDhikrCount(dhikrId, count) {
  const data = await loadData();
  const today = todayKey();

  // Update total for this dhikr
  data.totals[dhikrId] = (data.totals[dhikrId] || 0) + count;

  // Reset daily total if new day
  if (data.lastSessionDate !== today) {
    data.dailyTotal = 0;
    data.lastSessionDate = today;
  }
  data.dailyTotal += count;

  // Add session record (keep last 100 sessions)
  data.sessions.push({
    dhikrId,
    count,
    date: new Date().toISOString(),
  });
  if (data.sessions.length > 100) {
    data.sessions = data.sessions.slice(-100);
  }

  await saveData(data);
  return data;
}

/**
 * Update stored totals (called on each tap for real-time saving).
 */
export async function updateDhikrTotals(dhikrId, totalForThisDhikr, overallTotal) {
  const data = await loadData();
  const today = todayKey();

  data.totals[dhikrId] = totalForThisDhikr;

  if (data.lastSessionDate !== today) {
    data.dailyTotal = 0;
    data.lastSessionDate = today;
  }

  await saveData(data);
  return data;
}

/**
 * Get all stored dhikr data.
 */
export async function getDhikrData() {
  return loadData();
}

/**
 * Get total count for a specific dhikr.
 */
export async function getDhikrTotal(dhikrId) {
  const data = await loadData();
  return data.totals[dhikrId] || 0;
}

/**
 * Get grand total across all dhikrs.
 */
export async function getGrandTotal() {
  const data = await loadData();
  return Object.values(data.totals).reduce((sum, v) => sum + v, 0);
}

/**
 * Get today's total.
 */
export async function getDailyTotal() {
  const data = await loadData();
  const today = todayKey();
  if (data.lastSessionDate !== today) return 0;
  return data.dailyTotal || 0;
}

/**
 * Reset all dhikr data.
 */
export async function resetAllDhikr() {
  await saveData({ totals: {}, sessions: [], lastSessionDate: null, dailyTotal: 0 });
}
