/**
 * Ramadan mode utility.
 * Detects if current date is within Ramadan, provides iftar/sahur info.
 * Supports manual override via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { gregorianToHijri } from './hijriDate';

const RAMADAN_OVERRIDE_KEY = '@ramadan_override';

export function checkRamadan(date = new Date()) {
  const h = gregorianToHijri(date);

  if (h.month === 9) {
    return {
      isRamadan: true,
      dayOfRamadan: h.day,
      totalDays: 30, // Hijri months are 29 or 30 days, we'll assume 30 for the UI
      range: null,
    };
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

export function getNextRamadanStart(now = new Date()) {
  let date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let daysLeft = 0;

  // Scan forward day by day to find the next Ramadan 1st
  // The loop runs at most ~355 times, which is instantaneous in JS
  while (true) {
    daysLeft++;
    date.setDate(date.getDate() + 1);
    const h = gregorianToHijri(date);
    
    // Found the first day of Ramadan (month 9, day 1)
    if (h.month === 9 && h.day === 1) {
      return { date: new Date(date), daysLeft };
    }
  }
}
