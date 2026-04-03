/**
 * Prayer Times API Service — Ayasofya API (Santral Software).
 *
 * Strategy:
 *   1. Check SQLite DB for today's data by date
 *   2. If not found, fetch 60-day prayer times from API and save to SQLite
 *   3. Fallback to local astronomical calculation if offline & not in DB
 *
 * API: https://ayasofya.santralsoftware.com/api/v1/prayer-times
 */

import { calculatePrayerTimes } from './prayerCalculation';
import { getDB } from './db';

const API_BASE = 'https://ayasofya.santralsoftware.com/api/v1/prayer-times';
const API_KEY = 'BEqnMI9HJ2IXwNVxljJOuNyvU0s28oEE';
const FETCH_TIMEOUT = 10000; // 10 seconds

/* ── Helpers ── */

function dateToDbFormat(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse "HH:MM" into a Date object */
function timeToDate(timeStr, baseDate, tz) {
  if (!timeStr) return new Date(); // Fallback to avoid crash
  const [h, m] = timeStr.trim().split(':').map(Number);
  const d = new Date(baseDate);
  const deviceTz = -d.getTimezoneOffset() / 60;
  
  // Adjust for difference between local device timezone and target city timezone
  d.setHours(h + (deviceTz - tz), m, 0, 0);
  return d;
}

/** Map SQLite row → our standard prayer array format */
function parseDbRow(row, baseDate, tz) {
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  return [
    { key: 'imsak',  label: 'İmsak',  time: row.imsak,  date: timeToDate(row.imsak, base, tz) },
    { key: 'gunes',  label: 'Güneş',  time: row.gunes,  date: timeToDate(row.gunes, base, tz) },
    { key: 'ogle',   label: 'Öğle',   time: row.ogle,   date: timeToDate(row.ogle, base, tz) },
    { key: 'ikindi', label: 'İkindi', time: row.ikindi, date: timeToDate(row.ikindi, base, tz) },
    { key: 'aksam',  label: 'Akşam',  time: row.aksam,  date: timeToDate(row.aksam, base, tz) },
    { key: 'yatsi',  label: 'Yatsı',  time: row.yatsi,  date: timeToDate(row.yatsi, base, tz) },
  ];
}

/* ── API Fetch & Storage ── */

let activeFetch = null; // { promise, lat, lng, ts }
const ACTIVE_FETCH_TTL = 15000; // stale after 15s – prevents permanent block

async function fetchAndSaveToDb(lat, lng) {
  // Reuse in-flight request for same coords if still fresh
  if (activeFetch && activeFetch.lat === lat && activeFetch.lng === lng
      && (Date.now() - activeFetch.ts) < ACTIVE_FETCH_TTL) {
    return activeFetch.promise;
  }
  // Clear stale entry
  activeFetch = null;

  const promise = (async () => {
    const url = `${API_BASE}?lat=${lat.toFixed(2)}&lon=${lng.toFixed(2)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        method: "GET",
        headers: {
          "X-API-Key": API_KEY,
          "Content-Type": "application/json"
        }
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!json.prayer_times || typeof json.prayer_times !== 'object') {
        console.error("API response missing prayer_times. json:", JSON.stringify(json));
        console.error("Request lat:", lat, "lng:", lng);
        throw new Error('Invalid API response structure');
      }

      const db = await getDB();
      
      const dayEntries = Object.entries(json.prayer_times);
      for (const [dateStr, day] of dayEntries) {
        await db.runAsync(
          `INSERT OR REPLACE INTO prayer_times (date, hicri, imsak, gunes, ogle, ikindi, aksam, yatsi) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [dateStr, day.hicri, day.imsak, day.gunes, day.ogle, day.ikindi, day.aksam, day.yatsi]
        );
      }
      
      // Cleanup old dates from cache (keep 30 days for offline use)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const oldDateStr = dateToDbFormat(cutoff);
      await db.runAsync(`DELETE FROM prayer_times WHERE date < ?`, [oldDateStr]);

    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  })();

  activeFetch = { promise, lat, lng, ts: Date.now() };

  try {
    await promise;
  } finally {
    activeFetch = null;
  }
}

/* ── Public: getPrayerTimes ── */

/**
 * Get prayer times for a given date and location.
 * Tries DB Cache → API Fetch → Local calculation.
 *
 * @param {Date}   date
 * @param {number} lat
 * @param {number} lng
 * @param {number} tz  – timezone offset in hours (fallback only)
 * @returns {Promise<{ prayers: Array, source: 'cache'|'api'|'local' }>}
 */
export async function getPrayerTimes(date, lat, lng, tz) {
  const dateStr = dateToDbFormat(date);
  let db;
  try {
    db = await getDB();
  } catch(e) {
    return { prayers: calculatePrayerTimes(date, lat, lng, tz), source: 'local' };
  }

  // 1️⃣ Cache check (SQLite)
  try {
    const row = await db.getFirstAsync(`SELECT * FROM prayer_times WHERE date = ?`, [dateStr]);
    if (row) {
      const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return { prayers: parseDbRow(row, base, tz), hicri: row.hicri, source: 'cache' };
    }
  } catch (err) {
    console.warn("Prayer db read error:", err);
  }

  // 2️⃣ API fetch
  try {
    await fetchAndSaveToDb(lat, lng);
    
    // Search DB again after fetch
    const row = await db.getFirstAsync(`SELECT * FROM prayer_times WHERE date = ?`, [dateStr]);
    if (row) {
      const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return { prayers: parseDbRow(row, base, tz), hicri: row.hicri, source: 'api' };
    }
  } catch (err) {
    console.warn("Prayer API fetch error:", err);
  }

  // 3️⃣ Local fallback (offline)
  return { prayers: calculatePrayerTimes(date, lat, lng, tz), source: 'local' };
}

/**
 * Synchronous fallback – for the initial render before async resolves.
 * Uses only local astronomical calculation.
 */
export function getPrayerTimesSync(date, lat, lng, tz) {
  return calculatePrayerTimes(date, lat, lng, tz);
}

/**
 * Prefetch prayer times for today + tomorrow.
 * Call at app launch to ensure cache is warm.
 */
export async function prefetchPrayerTimes(lat, lng, tz) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await Promise.all([
    getPrayerTimes(today, lat, lng, tz),
    getPrayerTimes(tomorrow, lat, lng, tz),
  ]);
}
