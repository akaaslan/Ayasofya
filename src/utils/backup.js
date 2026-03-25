import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import { getDB } from './db';

const BACKUP_TABLES = ['prayer_tracking', 'kaza', 'dhikr_totals', 'dhikr_sessions', 'dhikr_daily'];

/**
 * Export all prayer/kaza/dhikr data as JSON and share via system share sheet.
 */
export async function exportBackup() {
  const db = await getDB();
  const backup = {};

  for (const table of BACKUP_TABLES) {
    const rows = await db.getAllAsync(`SELECT * FROM ${table}`);
    backup[table] = rows;
  }

  backup._meta = {
    app: 'Ayasofya',
    version: 1,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(backup, null, 2);
  const path = FileSystem.cacheDirectory + 'ayasofya_backup.json';
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });

  await shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Ayasofya Yedek',
    UTI: 'public.json',
  });

  return true;
}

/**
 * Import backup from a JSON string (e.g., from DocumentPicker).
 * Returns { success: boolean, counts: object }.
 */
export async function importBackup(jsonString) {
  const data = JSON.parse(jsonString);

  if (!data._meta || data._meta.app !== 'Ayasofya') {
    throw new Error('Invalid backup file');
  }

  const db = await getDB();
  const counts = {};

  await db.withTransactionAsync(async () => {
    // Prayer tracking
    if (Array.isArray(data.prayer_tracking)) {
      for (const row of data.prayer_tracking) {
        await db.runAsync(
          `INSERT OR REPLACE INTO prayer_tracking (dateKey, prayerKey, checked) VALUES (?, ?, ?)`,
          [row.dateKey, row.prayerKey, row.checked]
        );
      }
      counts.prayer_tracking = data.prayer_tracking.length;
    }

    // Kaza
    if (Array.isArray(data.kaza)) {
      for (const row of data.kaza) {
        await db.runAsync(
          `INSERT OR REPLACE INTO kaza (prayerKey, count) VALUES (?, ?)`,
          [row.prayerKey, row.count]
        );
      }
      counts.kaza = data.kaza.length;
    }

    // Dhikr totals
    if (Array.isArray(data.dhikr_totals)) {
      for (const row of data.dhikr_totals) {
        await db.runAsync(
          `INSERT OR REPLACE INTO dhikr_totals (dhikrId, total) VALUES (?, ?)`,
          [row.dhikrId, row.total]
        );
      }
      counts.dhikr_totals = data.dhikr_totals.length;
    }

    // Dhikr sessions
    if (Array.isArray(data.dhikr_sessions)) {
      for (const row of data.dhikr_sessions) {
        await db.runAsync(
          `INSERT INTO dhikr_sessions (dhikrId, count, date) VALUES (?, ?, ?)`,
          [row.dhikrId, row.count, row.date]
        );
      }
      counts.dhikr_sessions = data.dhikr_sessions.length;
    }

    // Dhikr daily
    if (Array.isArray(data.dhikr_daily)) {
      for (const row of data.dhikr_daily) {
        await db.runAsync(
          `INSERT OR REPLACE INTO dhikr_daily (dateKey, dailyTotal) VALUES (?, ?)`,
          [row.dateKey, row.dailyTotal]
        );
      }
      counts.dhikr_daily = data.dhikr_daily.length;
    }
  });

  return { success: true, counts };
}
