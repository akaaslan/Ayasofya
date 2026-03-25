/**
 * Islamic / Turkish religious holidays utility.
 * Dynamically computes approximate Gregorian dates from Hijri calendar
 * so holidays auto-shift each year without hardcoding.
 */

import { gregorianToHijri } from './hijriDate';

/* ── Holidays defined by Hijri month/day ─────────── */
const HIJRI_HOLIDAYS = [
  { nameKey: 'holiday_regaib', defaultName: 'Regaib Kandili',       month: 7, day: 1 },   // 1st Thurs of Recep (approx Recep 1)
  { nameKey: 'holiday_mirac', defaultName: 'Miraç Kandili',        month: 7, day: 27 },  // 27 Recep
  { nameKey: 'holiday_berat', defaultName: 'Berat Kandili',        month: 8, day: 15 },  // 15 Şaban
  { nameKey: 'holiday_ramadan', defaultName: 'Ramazan Başlangıcı',   month: 9, day: 1 },   // 1 Ramazan
  { nameKey: 'holiday_kadir', defaultName: 'Kadir Gecesi',         month: 9, day: 27 },  // 27 Ramazan
  { nameKey: 'holiday_eid_fitr', defaultName: 'Ramazan Bayramı',      month: 10, day: 1 },  // 1 Şevval
  { nameKey: 'holiday_eid_adha', defaultName: 'Kurban Bayramı',       month: 12, day: 10 }, // 10 Zilhicce
  { nameKey: 'holiday_hijri', defaultName: 'Hicri Yılbaşı',        month: 1, day: 1 },   // 1 Muharrem
  { nameKey: 'holiday_ashura', defaultName: 'Aşure Günü',           month: 1, day: 10 },  // 10 Muharrem
  { nameKey: 'holiday_mawlid', defaultName: 'Mevlid Kandili',       month: 3, day: 12 },  // 12 Rebiülevvel
];

/**
 * Find the approximate Gregorian date for a given Hijri month/day
 * by scanning days forward from a start point.
 * Returns a Date or null if not found within scan range.
 */
function hijriToGregorian(hijriMonth, hijriDay, startGregorian, maxDays = 400) {
  const start = new Date(startGregorian);
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const h = gregorianToHijri(d);
    if (h.month === hijriMonth && h.day === hijriDay) {
      return d;
    }
  }
  return null;
}

/**
 * Build dynamic holidays list for the upcoming ~14 months from `now`.
 * Caches per Gregorian year to avoid re-scanning on every call.
 */
const _cache = {};
function buildHolidays(now) {
  const yearKey = now.getFullYear();
  if (_cache[yearKey]) return _cache[yearKey];

  const scanStart = new Date(now.getFullYear(), 0, 1); // start of current year
  const holidays = [];

  for (const h of HIJRI_HOLIDAYS) {
    // Scan from start of year
    const d = hijriToGregorian(h.month, h.day, scanStart, 500);
    if (d) holidays.push({ nameKey: h.nameKey, defaultName: h.defaultName, date: d });

    // Also scan from ~354 days later for next Hijri year occurrence
    const nextStart = new Date(scanStart);
    nextStart.setDate(nextStart.getDate() + 340);
    const d2 = hijriToGregorian(h.month, h.day, nextStart, 400);
    if (d2 && d2.getTime() !== d?.getTime()) {
      holidays.push({ nameKey: h.nameKey, defaultName: h.defaultName, date: d2 });
    }
  }

  // Sort chronologically
  holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
  _cache[yearKey] = holidays;
  return holidays;
}

/** Helper: compute days/hours/minutes left */
function computeDiff(targetDate, now) {
  const diffMs = targetDate.getTime() - now.getTime();
  const totalMin = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  return { daysLeft: days, hoursLeft: hours, minutesLeft: minutes, diffMs };
}

/**
 * Get the next upcoming religious holiday from today.
 * Returns { name, date, daysLeft, hoursLeft, minutesLeft } or null.
 */
export function getNextHoliday(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const holidays = buildHolidays(now);

  for (const h of holidays) {
    if (h.date >= today) {
      const diff = computeDiff(h.date, now);
      return { nameKey: h.nameKey, defaultName: h.defaultName, date: h.date, ...diff };
    }
  }
  return null;
}

/**
 * Get ALL upcoming holidays (from today onward) with countdown info.
 * Returns array of { name, date, daysLeft, hoursLeft, minutesLeft, diffMs }.
 */
export function getAllUpcomingHolidays(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  const holidays = buildHolidays(now);
  return holidays
    .filter((h) => h.date >= today && h.date <= oneYearFromNow)
    .map((h) => ({ nameKey: h.nameKey, defaultName: h.defaultName, date: h.date, ...computeDiff(h.date, now) }));
}
