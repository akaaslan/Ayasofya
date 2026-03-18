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

      // Try adding hicri column for existing databases
      try {
        await db.execAsync(`ALTER TABLE prayer_times ADD COLUMN hicri TEXT;`);
      } catch (e) {
        // Column probably exists
      }

      return db;
    })();
  }
  
  dbInstance = await initPromise;
  return dbInstance;
}
