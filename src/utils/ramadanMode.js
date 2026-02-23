/**
 * Ramadan mode utility.
 * Detects if current date is within Ramadan, provides iftar/sahur info.
 * Supports manual override via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RAMADAN_OVERRIDE_KEY = '@ramadan_override';

/* ── Ramadan date ranges (Gregorian approximations) ── */
const RAMADAN_RANGES = [
  { year: 2026, start: new Date(2026, 1, 18), end: new Date(2026, 2, 19) }, // Feb 18 - Mar 19
  { year: 2027, start: new Date(2027, 1, 8),  end: new Date(2027, 2, 9) },  // Feb 8 - Mar 9
  { year: 2028, start: new Date(2028, 0, 28), end: new Date(2028, 1, 26) }, // Jan 28 - Feb 26
];

/**
 * Check if a given date falls within Ramadan (calendar-based only).
 * Returns { isRamadan, dayOfRamadan, totalDays, range } or { isRamadan: false }
 */
export function checkRamadan(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  for (const range of RAMADAN_RANGES) {
    if (today >= range.start && today <= range.end) {
      const dayOfRamadan = Math.floor((today - range.start) / 86400000) + 1;
      const totalDays = Math.floor((range.end - range.start) / 86400000) + 1;
      return {
        isRamadan: true,
        dayOfRamadan,
        totalDays,
        range,
      };
    }
  }

  return { isRamadan: false, dayOfRamadan: 0, totalDays: 0, range: null };
}

/**
 * Get the user's Ramadan mode override preference.
 * Returns: 'auto' | 'on' | 'off'
 *   - 'auto': follow calendar detection
 *   - 'on':   force Ramadan mode on
 *   - 'off':  force Ramadan mode off
 */
export async function getRamadanOverride() {
  try {
    const val = await AsyncStorage.getItem(RAMADAN_OVERRIDE_KEY);
    if (val === 'on' || val === 'off') return val;
  } catch { /* ignore */ }
  return 'auto';
}

/**
 * Save Ramadan override preference.
 * @param {'auto'|'on'|'off'} mode
 */
export async function setRamadanOverride(mode) {
  try {
    await AsyncStorage.setItem(RAMADAN_OVERRIDE_KEY, mode);
  } catch { /* ignore */ }
}

/**
 * Resolve effective Ramadan state considering override.
 * @param {'auto'|'on'|'off'} override
 * @returns {{ isRamadan, dayOfRamadan, totalDays, range, mode }}
 */
export function resolveRamadan(override = 'auto') {
  const calendar = checkRamadan();
  if (override === 'on') {
    // Force on — if not actually Ramadan, simulate day 1
    if (calendar.isRamadan) return { ...calendar, mode: 'on' };
    return { isRamadan: true, dayOfRamadan: 0, totalDays: 30, range: null, mode: 'on' };
  }
  if (override === 'off') {
    return { isRamadan: false, dayOfRamadan: 0, totalDays: 0, range: null, mode: 'off' };
  }
  return { ...calendar, mode: 'auto' };
}

/**
 * Get Ramadan-specific info for the home screen.
 * Uses prayer times to compute iftar/sahur countdown.
 *
 * @param {Array} prayers - Prayer times array from calculatePrayerTimes
 * @param {Date} now - Current time
 * @returns {{ iftarTime, sahurTime, iftarCountdown, sahurCountdown, isBeforeIftar }}
 */
export function getRamadanInfo(prayers, now = new Date()) {
  if (!prayers || prayers.length === 0) return null;

  const imsak = prayers.find((p) => p.key === 'imsak');
  const aksam = prayers.find((p) => p.key === 'aksam');

  if (!imsak || !aksam) return null;

  const imsakMs = imsak.date.getTime();
  const aksamMs = aksam.date.getTime();
  const nowMs = now.getTime();

  const isBeforeIftar = nowMs < aksamMs;
  const isBeforeSahur = nowMs < imsakMs;

  // Iftar countdown
  let iftarCountdown = '';
  let iftarRemaining = 0;
  if (isBeforeIftar) {
    iftarRemaining = aksamMs - nowMs;
    iftarCountdown = formatMs(iftarRemaining);
  }

  // Sahur countdown (only relevant before imsak)
  let sahurCountdown = '';
  let sahurRemaining = 0;
  if (isBeforeSahur) {
    sahurRemaining = imsakMs - nowMs;
    sahurCountdown = formatMs(sahurRemaining);
  }

  return {
    iftarTime: aksam.time,
    sahurTime: imsak.time,
    iftarCountdown,
    sahurCountdown,
    isBeforeIftar,
    isBeforeSahur,
    iftarRemaining,
    sahurRemaining,
  };
}

function formatMs(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Get the next Ramadan start date if not currently in Ramadan.
 */
export function getNextRamadanStart(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const range of RAMADAN_RANGES) {
    if (range.start > today) {
      const diffMs = range.start.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / 86400000);
      return { date: range.start, daysLeft };
    }
  }
  return null;
}
