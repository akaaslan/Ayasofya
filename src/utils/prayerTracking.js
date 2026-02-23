import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'prayer_tracking';

/**
 * Prayer tracking data structure:
 * {
 *   [dateKey: 'YYYY-MM-DD']: {
 *     imsak: boolean,
 *     ogle: boolean,
 *     ikindi: boolean,
 *     aksam: boolean,
 *     yatsi: boolean,
 *   }
 * }
 */

const TRACKABLE_PRAYERS = ['imsak', 'ogle', 'ikindi', 'aksam', 'yatsi'];

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Load all tracking data from storage */
async function loadAll() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save all tracking data */
async function saveAll(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silently fail
  }
}

/**
 * Get tracking data for a specific date.
 * Returns { imsak: false, ogle: false, ikindi: false, aksam: false, yatsi: false }
 */
export async function getDayTracking(date = new Date()) {
  const data = await loadAll();
  const key = dateKey(date);
  const day = data[key] || {};
  const result = {};
  for (const p of TRACKABLE_PRAYERS) {
    result[p] = day[p] === true;
  }
  return result;
}

/**
 * Toggle a single prayer for a date.
 */
export async function togglePrayer(prayerKey, date = new Date()) {
  const data = await loadAll();
  const key = dateKey(date);
  if (!data[key]) data[key] = {};
  data[key][prayerKey] = !data[key][prayerKey];
  await saveAll(data);
  return data[key][prayerKey];
}

/**
 * Get the current streak (consecutive days with all 5 prayers checked).
 * Counts backward from yesterday.
 */
export async function getStreak() {
  const data = await loadAll();
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1); // start from yesterday

  // Also check if today is complete
  const todayKey = dateKey(new Date());
  const todayData = data[todayKey];
  const todayComplete = todayData && TRACKABLE_PRAYERS.every((p) => todayData[p] === true);

  while (true) {
    const key = dateKey(d);
    const dayData = data[key];
    if (!dayData) break;
    const allDone = TRACKABLE_PRAYERS.every((p) => dayData[p] === true);
    if (!allDone) break;
    streak++;
    d.setDate(d.getDate() - 1);
    if (streak > 365) break; // safety
  }

  if (todayComplete) streak++;

  return streak;
}

/**
 * Get weekly stats (last 7 days including today).
 * Returns array of { date, dateKey, completed, total: 5, dayLabel }
 */
export async function getWeeklyStats() {
  const data = await loadAll();
  const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const stats = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const dayData = data[key] || {};
    const completed = TRACKABLE_PRAYERS.filter((p) => dayData[p] === true).length;
    stats.push({
      date: new Date(d),
      dateKey: key,
      completed,
      total: 5,
      dayLabel: dayLabels[d.getDay()],
      dayNum: d.getDate(),
    });
  }

  return stats;
}

export { TRACKABLE_PRAYERS, dateKey };
