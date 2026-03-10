/**
 * Prayer Times API Service — Aladhan API with Diyanet method.
 *
 * Strategy (hybrid):
 *   1. Check AsyncStorage cache for today's data
 *   2. Fetch from Aladhan API (method=13 → Diyanet/Turkey)
 *   3. Fallback to local astronomical calculation if offline
 *
 * API: https://aladhan.com/prayer-times-api
 * Free, no API key required.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculatePrayerTimes } from './prayerCalculation';

const API_BASE = 'https://api.aladhan.com/v1/timings';
const CACHE_PREFIX = '@prayer_api_';
const FETCH_TIMEOUT = 8000; // 8 seconds

/* ── Helpers ── */

function dateToApiFormat(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function cacheKey(date, lat, lng) {
  const d = dateToApiFormat(date);
  const la = lat.toFixed(2);
  const lo = lng.toFixed(2);
  return `${CACHE_PREFIX}${d}_${la}_${lo}`;
}

/** Parse "HH:MM" (or "HH:MM (TZ)") into a Date object */
function timeToDate(timeStr, baseDate, tz) {
  const clean = timeStr.trim().substring(0, 5); // strip any " (EET)" suffix
  const [h, m] = clean.split(':').map(Number);
  const d = new Date(baseDate);
  const deviceTz = -d.getTimezoneOffset() / 60;
  
  // Adjust for difference between local device timezone and target city timezone
  d.setHours(h + (deviceTz - tz), m, 0, 0);
  return d;
}

/** Map Aladhan API response → our standard prayer array format */
function parseApiTimings(timings, baseDate, tz) {
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  return [
    { key: 'imsak', label: 'İmsak', time: timings.Fajr.substring(0, 5), date: timeToDate(timings.Fajr, base, tz) },
    { key: 'gunes', label: 'Güneş', time: timings.Sunrise.substring(0, 5), date: timeToDate(timings.Sunrise, base, tz) },
    { key: 'ogle',  label: 'Öğle',  time: timings.Dhuhr.substring(0, 5), date: timeToDate(timings.Dhuhr, base, tz) },
    { key: 'ikindi', label: 'İkindi', time: timings.Asr.substring(0, 5), date: timeToDate(timings.Asr, base, tz) },
    { key: 'aksam', label: 'Akşam', time: timings.Maghrib.substring(0, 5), date: timeToDate(timings.Maghrib, base, tz) },
    { key: 'yatsi', label: 'Yatsı', time: timings.Isha.substring(0, 5), date: timeToDate(timings.Isha, base, tz) },
  ];
}

/* ── API Fetch ── */

async function fetchFromApi(date, lat, lng) {
  const dateStr = dateToApiFormat(date);
  const url = `${API_BASE}/${dateStr}?latitude=${lat}&longitude=${lng}&method=13`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.code !== 200 || !json.data?.timings) {
      throw new Error('Invalid API response');
    }
    return json.data.timings;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/* ── Public: Hybrid getPrayerTimes ── */

/**
 * Get prayer times for a given date and location.
 * Tries cache → API → local calculation.
 *
 * @param {Date}   date
 * @param {number} lat
 * @param {number} lng
 * @param {number} tz  – timezone offset in hours (fallback only)
 * @returns {Promise<{ prayers: Array, source: 'cache'|'api'|'local' }>}
 */
export async function getPrayerTimes(date, lat, lng, tz) {
  const key = cacheKey(date, lat, lng);

  // 1️⃣  Cache check
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const timings = JSON.parse(cached);
      const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return { prayers: parseApiTimings(timings, base, tz), source: 'cache' };
    }
  } catch { /* ignore cache miss */ }

  // 2️⃣  API fetch
  try {
    const timings = await fetchFromApi(date, lat, lng);
    // Save to cache (fire-and-forget)
    AsyncStorage.setItem(key, JSON.stringify(timings)).catch(() => {});
    // Clean old cache entries (keep last 7 days)
    cleanOldCache().catch(() => {});
    const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return { prayers: parseApiTimings(timings, base, tz), source: 'api' };
  } catch { /* API failed – fall through */ }

  // 3️⃣  Local fallback (offline)
  return { prayers: calculatePrayerTimes(date, lat, lng, tz), source: 'local' };
}

/**
 * Synchronous fallback – for the initial render before async resolves.
 * Uses only local astronomical calculation.
 */
export function getPrayerTimesSync(date, lat, lng, tz) {
  return calculatePrayerTimes(date, lat, lng, tz);
}

/* ── Cache maintenance ── */

async function cleanOldCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const prayerKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (prayerKeys.length <= 14) return; // keep up to 14 days

    // Sort and remove oldest
    prayerKeys.sort();
    const toRemove = prayerKeys.slice(0, prayerKeys.length - 14);
    await AsyncStorage.multiRemove(toRemove);
  } catch { /* silent */ }
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
