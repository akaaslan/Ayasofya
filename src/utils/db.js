import * as SQLite from 'expo-sqlite';

let dbInstance = null;

let initPromise = null;

export async function getDB() {
  if (dbInstance) return dbInstance;
  
  if (!initPromise) {
    initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('ayasofya.db');
      
      // Initialize Kaza tracking table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS kaza (
          prayerKey TEXT PRIMARY KEY,
          count INTEGER DEFAULT 0
        );
      `);
      
      // Initialize Prayer tracking table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS prayer_tracking (
          dateKey TEXT,
          prayerKey TEXT,
          checked INTEGER DEFAULT 0,
          PRIMARY KEY (dateKey, prayerKey)
        );
      `);

      // Initialize Dhikr tables
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS dhikr_totals (
          dhikrId TEXT PRIMARY KEY,
          total INTEGER DEFAULT 0
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS dhikr_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dhikrId TEXT,
          count INTEGER,
          date TEXT
        );
      `);

      // Initialize Dhikr Daily tracking (for today's session)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS dhikr_daily (
          dateKey TEXT PRIMARY KEY,
          dailyTotal INTEGER DEFAULT 0
        );
      `);

      // Initialize simple key-value settings / cache
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS key_value_store (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // Initialize API Prayer Times Cache
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS prayer_times (
          date TEXT PRIMARY KEY,
          hicri TEXT,
          imsak TEXT,
          gunes TEXT,
          ogle TEXT,
          ikindi TEXT,
          aksam TEXT,
          yatsi TEXT
        );
      `);

      // Initialize detailed Quran structure
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS surahs (
          id INTEGER,
          language TEXT,
          name TEXT,
          aya_count INTEGER,
          PRIMARY KEY (id, language)
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ayas (
          id INTEGER PRIMARY KEY,
          surah_id INTEGER,
          aya_number INTEGER,
          juz_number INTEGER,
          page_number INTEGER,
          text TEXT,
          transliteration TEXT,
          UNIQUE(surah_id, aya_number)
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tafsirs (
          id INTEGER PRIMARY KEY,
          aya_id INTEGER,
          author TEXT,
          language TEXT,
          text TEXT,
          FOREIGN KEY (aya_id) REFERENCES ayas(id),
          UNIQUE(aya_id, author, language)
        );
      `);

      // Try adding hicri column for existing databases
      try {
        await db.execAsync(`ALTER TABLE prayer_times ADD COLUMN hicri TEXT;`);
      } catch (e) {
        // Column probably exists
      }

      // Try adding transliteration column for existing databases
      try {
        await db.execAsync(`ALTER TABLE ayas ADD COLUMN transliteration TEXT;`);
      } catch (e) {
        // Column probably exists
      }

      return db;
    })();
  }
  
  dbInstance = await initPromise;
  return dbInstance;
}

/**
 * Clears only cached data (Quran content, prayer times, etc.)
 */
export async function clearCache() {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.execAsync(`DELETE FROM surahs;`);
    await db.execAsync(`DELETE FROM ayas;`);
    await db.execAsync(`DELETE FROM tafsirs;`);
    await db.execAsync(`DELETE FROM prayer_times;`);
    await db.execAsync(`DELETE FROM key_value_store WHERE key LIKE 'tafsirs_%' OR key = 'reciters';`);
    await db.execAsync('COMMIT');
    await db.execAsync('VACUUM');
    return true;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    console.error("clearCache error:", e);
    return false;
  }
}

/**
 * Resets all user data, including prayer tracking, kaza, dhikr and cache.
 */
export async function resetAllData() {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.execAsync(`DELETE FROM kaza;`);
    await db.execAsync(`DELETE FROM prayer_tracking;`);
    await db.execAsync(`DELETE FROM dhikr_totals;`);
    await db.execAsync(`DELETE FROM dhikr_sessions;`);
    await db.execAsync(`DELETE FROM dhikr_daily;`);
    await db.execAsync(`DELETE FROM key_value_store;`);
    await db.execAsync(`DELETE FROM surahs;`);
    await db.execAsync(`DELETE FROM ayas;`);
    await db.execAsync(`DELETE FROM tafsirs;`);
    await db.execAsync(`DELETE FROM prayer_times;`);
    await db.execAsync('COMMIT');
    await db.execAsync('VACUUM');
    return true;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    console.error("resetAllData error:", e);
    return false;
  }
}
