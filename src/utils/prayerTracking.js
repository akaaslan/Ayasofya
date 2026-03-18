import { getDB } from './db';

const TRACKABLE_PRAYERS = ['imsak', 'ogle', 'ikindi', 'aksam', 'yatsi'];

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get tracking data for a specific date.
 * Returns { imsak: false, ogle: false, ikindi: false, aksam: false, yatsi: false }
 */
export async function getDayTracking(date = new Date()) {
  const db = await getDB();
  const key = dateKey(date);
  const rows = await db.getAllAsync(
    'SELECT prayerKey, checked FROM prayer_tracking WHERE dateKey = ?',
    [key]
  );
  
  const result = {};
  for (const p of TRACKABLE_PRAYERS) {
    result[p] = false;
  }
  for (const row of rows) {
    if (TRACKABLE_PRAYERS.includes(row.prayerKey)) {
      result[row.prayerKey] = row.checked === 1;
    }
  }
  return result;
}

/**
 * Toggle a single prayer for a date.
 */
export async function togglePrayer(prayerKey, date = new Date()) {
  const db = await getDB();
  const key = dateKey(date);
  
  const existing = await db.getFirstAsync(
    'SELECT checked FROM prayer_tracking WHERE dateKey = ? AND prayerKey = ?',
    [key, prayerKey]
  );
  
  const isChecked = existing?.checked === 1;
  const newValue = isChecked ? 0 : 1;
  
  await db.runAsync(
    `INSERT INTO prayer_tracking (dateKey, prayerKey, checked) VALUES (?, ?, ?)
     ON CONFLICT(dateKey, prayerKey) DO UPDATE SET checked = excluded.checked`,
    [key, prayerKey, newValue]
  );
  
  return newValue === 1;
}

/**
 * Get the current streak (consecutive days with all 5 prayers checked).
 * Counts backward from yesterday.
 */
export async function getStreak() {
  const db = await getDB();
  let streak = 0;
  
  // Get all days where all 5 prayers are checked
  const rows = await db.getAllAsync(`
    SELECT dateKey 
    FROM prayer_tracking 
    WHERE checked = 1 
    GROUP BY dateKey 
    HAVING COUNT(DISTINCT prayerKey) = 5
    ORDER BY dateKey DESC
  `);
  
  const completeDays = new Set(rows.map(r => r.dateKey));
  
  const todayKey = dateKey(new Date());
  const todayComplete = completeDays.has(todayKey);
  
  const d = new Date();
  d.setDate(d.getDate() - 1); // start from yesterday
  
  while (true) {
    const key = dateKey(d);
    if (!completeDays.has(key)) break;
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
  const db = await getDB();
  const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const stats = [];
  
  // Prepare all last 7 days keys
  const keys = [];
  const daysInfo = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    keys.push(`'${key}'`);
    daysInfo.push({ date: d, key: key, idx: i });
  }
  
  const rows = await db.getAllAsync(`
    SELECT dateKey, COUNT(*) as completed 
    FROM prayer_tracking 
    WHERE checked = 1 AND dateKey IN (${keys.join(',')})
    GROUP BY dateKey
  `);
  
  const countsMap = {};
  for (const row of rows) {
    countsMap[row.dateKey] = row.completed;
  }
  
  // They should be returned in descending or ascending order?
  // Original pushed from 6 to 0, so older dates to today.
  daysInfo.reverse();
  
  for (const info of daysInfo) {
    const completedCount = countsMap[info.key] || 0;
    stats.push({
      date: new Date(info.date), // return a new date instance
      dateKey: info.key,
      completed: completedCount,
      total: 5,
      dayLabel: dayLabels[info.date.getDay()],
      dayNum: info.date.getDate(),
    });
  }

  return stats;
}

export { TRACKABLE_PRAYERS, dateKey };
