import { getDB } from './db';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Increment the total and daily count by 1.
 * Called on every single tap for real-time persistence.
 */
export async function incrementDhikrCount(dhikrId) {
  const db = await getDB();
  const today = todayKey();

  // 1. Update total
  await db.runAsync(
    `INSERT INTO dhikr_totals (dhikrId, total) VALUES (?, 1)
     ON CONFLICT(dhikrId) DO UPDATE SET total = total + 1`,
    [dhikrId]
  );

  // 2. Update daily total
  await db.runAsync(
    `INSERT INTO dhikr_daily (dateKey, dailyTotal) VALUES (?, 1)
     ON CONFLICT(dateKey) DO UPDATE SET dailyTotal = dailyTotal + 1`,
    [today]
  );
}

/**
 * Save a completed session.
 * Called when a cycle (e.g. 100) is completed.
 */
export async function saveDhikrSession(dhikrId, count) {
  const db = await getDB();
  const today = todayKey();

  // 1. Add session (totals are already tracked by incrementDhikrCount per-tap)
  await db.runAsync(
    'INSERT INTO dhikr_sessions (dhikrId, count, date) VALUES (?, ?, ?)',
    [dhikrId, count, today]
  );

  // 3. Keep last 100 sessions
  const totalSessions = await db.getFirstAsync('SELECT COUNT(*) as c FROM dhikr_sessions');
  if (totalSessions?.c > 100) {
    const deleteCount = totalSessions.c - 100;
    await db.runAsync(
      `DELETE FROM dhikr_sessions WHERE id IN (
        SELECT id FROM dhikr_sessions ORDER BY id ASC LIMIT ?
      )`,
      [deleteCount]
    );
  }

  // 3. Clean up older daily totals
  await db.runAsync('DELETE FROM dhikr_daily WHERE dateKey != ?', [today]);

  return getDhikrData();
}

/**
 * Update stored totals (called on each tap for real-time saving).
 */
export async function updateDhikrTotals(dhikrId, totalForThisDhikr, overallTotal) {
  const db = await getDB();
  const today = todayKey();

  // Overwrite the dhikr total
  await db.runAsync(
    `INSERT INTO dhikr_totals (dhikrId, total) VALUES (?, ?)
     ON CONFLICT(dhikrId) DO UPDATE SET total = excluded.total`,
    [dhikrId, totalForThisDhikr]
  );

  // Reset daily total if new day
  const currentDaily = await db.getFirstAsync('SELECT dateKey FROM dhikr_daily WHERE dateKey = ?', [today]);
  if (!currentDaily) {
    await db.runAsync('DELETE FROM dhikr_daily;');
    await db.runAsync('INSERT INTO dhikr_daily (dateKey, dailyTotal) VALUES (?, 0)', [today]);
  }

  return getDhikrData();
}

/**
 * Get all stored dhikr data.
 * Returns { totals: {}, sessions: [], lastSessionDate: string, dailyTotal: 0 }
 */
export async function getDhikrData() {
  const db = await getDB();
  const today = todayKey();

  const totalsRows = await db.getAllAsync('SELECT * FROM dhikr_totals;');
  const totals = {};
  for (const row of totalsRows) {
    totals[row.dhikrId] = row.total;
  }

  const sessions = await db.getAllAsync('SELECT dhikrId, count, date FROM dhikr_sessions ORDER BY id ASC;');

  const dailyRow = await db.getFirstAsync('SELECT * FROM dhikr_daily WHERE dateKey = ?', [today]);
  
  return {
    totals,
    sessions,
    lastSessionDate: dailyRow ? dailyRow.dateKey : null,
    dailyTotal: dailyRow ? dailyRow.dailyTotal : 0,
  };
}

/**
 * Get total count for a specific dhikr.
 */
export async function getDhikrTotal(dhikrId) {
  const db = await getDB();
  const row = await db.getFirstAsync('SELECT total FROM dhikr_totals WHERE dhikrId = ?', [dhikrId]);
  return row?.total || 0;
}

/**
 * Get grand total across all dhikrs.
 */
export async function getGrandTotal() {
  const db = await getDB();
  const r = await db.getFirstAsync('SELECT SUM(total) as t FROM dhikr_totals;');
  return r?.t || 0;
}

/**
 * Get today's total.
 */
export async function getDailyTotal() {
  const db = await getDB();
  const today = todayKey();
  const row = await db.getFirstAsync('SELECT dailyTotal FROM dhikr_daily WHERE dateKey = ?', [today]);
  return row?.dailyTotal || 0;
}

/**
 * Reset all dhikr data.
 */
export async function resetAllDhikr() {
  const db = await getDB();
  await db.runAsync('DELETE FROM dhikr_totals;');
  await db.runAsync('DELETE FROM dhikr_sessions;');
  await db.runAsync('DELETE FROM dhikr_daily;');
}

/**
 * Reset data for a specific dhikr.
 */
export async function resetDhikr(dhikrId) {
  const db = await getDB();
  await db.runAsync('DELETE FROM dhikr_totals WHERE dhikrId = ?', [dhikrId]);
  await db.runAsync('DELETE FROM dhikr_sessions WHERE dhikrId = ?', [dhikrId]);
}
