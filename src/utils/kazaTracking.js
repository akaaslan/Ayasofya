import { getDB } from './db';

const PRAYER_TYPES = ['sabah', 'ogle', 'ikindi', 'aksam', 'yatsi', 'vitir', 'oruc'];

const DEFAULT_DATA = {
  sabah: 0,
  ogle: 0,
  ikindi: 0,
  aksam: 0,
  yatsi: 0,
  vitir: 0,
  oruc: 0,
};

/** Load kaza data from SQLite storage */
async function loadKazaData() {
  const db = await getDB();
  const rows = await db.getAllAsync('SELECT * FROM kaza;');
  const data = { ...DEFAULT_DATA };
  for (const row of rows) {
    if (PRAYER_TYPES.includes(row.prayerKey)) {
      data[row.prayerKey] = row.count;
    }
  }
  return data;
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
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO kaza (prayerKey, count) VALUES (?, ?) 
     ON CONFLICT(prayerKey) DO UPDATE SET count = count + excluded.count`,
    [prayerKey, amount]
  );
  // Re-read data
  return loadKazaData();
}

/**
 * Decrement kaza count for a prayer type (i.e., prayer was made up).
 */
export async function decrementKaza(prayerKey, amount = 1) {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO kaza (prayerKey, count) VALUES (?, 0) 
     ON CONFLICT(prayerKey) DO UPDATE SET count = CASE WHEN count - ? < 0 THEN 0 ELSE count - ? END`,
    [prayerKey, amount, amount]
  );
  return loadKazaData();
}

/**
 * Set kaza count directly for a prayer type.
 */
export async function setKazaCount(prayerKey, count) {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO kaza (prayerKey, count) VALUES (?, ?) 
     ON CONFLICT(prayerKey) DO UPDATE SET count = excluded.count`,
    [prayerKey, Math.max(0, count)]
  );
  return loadKazaData();
}

/**
 * Get total kaza remaining across all prayer types.
 */
export async function getTotalKaza() {
  const db = await getDB();
  const result = await db.getFirstAsync('SELECT SUM(count) as total FROM kaza;');
  return result?.total || 0;
}

/**
 * Reset all kaza counts to zero.
 */
export async function resetAllKaza() {
  const db = await getDB();
  await db.runAsync('DELETE FROM kaza;');
  return { ...DEFAULT_DATA };
}

/**
 * Restore kaza counts from a snapshot (for undo).
 */
export async function restoreKazaCounts(snapshot) {
  const db = await getDB();
  for (const key of PRAYER_TYPES) {
    if (snapshot[key] > 0) {
      await db.runAsync(
        `INSERT INTO kaza (prayerKey, count) VALUES (?, ?) ON CONFLICT(prayerKey) DO UPDATE SET count = excluded.count`,
        [key, snapshot[key]]
      );
    }
  }
}

export { PRAYER_TYPES };
