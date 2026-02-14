/**
 * Prayer time calculation using simplified astronomical formulas.
 * Method: Diyanet (Turkey) — Fajr angle 18°, Isha angle 17°
 *
 * This is a real calculation engine, not hardcoded values.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Diyanet method angles
const FAJR_ANGLE = 18;
const ISHA_ANGLE = 17;

// Default: Istanbul
const DEFAULT_LAT = 41.0082;
const DEFAULT_LNG = 28.9784;
const DEFAULT_TIMEZONE = 3; // UTC+3

function julianDate(year, month, day) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = Math.atan2(Math.cos(e * DEG) * Math.sin(L * DEG), Math.cos(L * DEG)) * RAD;
  const d = Math.asin(Math.sin(e * DEG) * Math.sin(L * DEG)) * RAD;
  // Equation of time (minutes)
  let EqT = (q - RA) / 15 * 60;
  if (EqT > 720) EqT -= 1440;
  if (EqT < -720) EqT += 1440;
  return { declination: d, eqTime: EqT };
}

function hourAngle(lat, decl, angle) {
  const cos_ha = (Math.sin(-angle * DEG) - Math.sin(lat * DEG) * Math.sin(decl * DEG)) /
                 (Math.cos(lat * DEG) * Math.cos(decl * DEG));
  if (cos_ha > 1 || cos_ha < -1) return NaN;
  return Math.acos(cos_ha) * RAD;
}

function asrHourAngle(lat, decl, factor = 1) {
  const a = Math.atan(1 / (factor + Math.tan(Math.abs(lat - decl) * DEG)));
  const cos_ha = (Math.sin(a) - Math.sin(lat * DEG) * Math.sin(decl * DEG)) /
                 (Math.cos(lat * DEG) * Math.cos(decl * DEG));
  if (cos_ha > 1 || cos_ha < -1) return NaN;
  return Math.acos(cos_ha) * RAD;
}

function minutesToHHMM(totalMinutes) {
  let mins = Math.round(totalMinutes);
  if (mins < 0) mins += 1440;
  mins = mins % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minutesToDate(totalMinutes, baseDate) {
  let mins = Math.round(totalMinutes);
  if (mins < 0) mins += 1440;
  mins = mins % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Calculate prayer times for a given date and location.
 * Returns an array of { key, label, time (HH:MM), date (Date object) }.
 */
export function calculatePrayerTimes(
  date = new Date(),
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG,
  timezone = DEFAULT_TIMEZONE,
) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = julianDate(year, month, day);
  const { declination, eqTime } = sunPosition(jd);

  // Dhuhr (solar noon)
  const dhuhr = 720 - eqTime - lng * 4 + timezone * 60;

  // Sunrise / Sunset (0.833° for atmospheric refraction + sun diameter)
  const sunHA = hourAngle(lat, declination, 0.833);
  const sunrise = dhuhr - sunHA / 15 * 60;
  const sunset = dhuhr + sunHA / 15 * 60;

  // Fajr (Imsak)
  const fajrHA = hourAngle(lat, declination, FAJR_ANGLE);
  const fajr = dhuhr - fajrHA / 15 * 60;

  // Asr (Hanafi: factor=1)
  const asrHA = asrHourAngle(lat, declination, 1);
  const asr = dhuhr + asrHA / 15 * 60;

  // Isha
  const ishaHA = hourAngle(lat, declination, ISHA_ANGLE);
  const isha = dhuhr + ishaHA / 15 * 60;

  const baseDate = new Date(year, month - 1, day);

  return [
    { key: 'imsak', label: 'İmsak', time: minutesToHHMM(fajr), date: minutesToDate(fajr, baseDate) },
    { key: 'gunes', label: 'Güneş', time: minutesToHHMM(sunrise), date: minutesToDate(sunrise, baseDate) },
    { key: 'ogle', label: 'Öğle', time: minutesToHHMM(dhuhr), date: minutesToDate(dhuhr, baseDate) },
    { key: 'ikindi', label: 'İkindi', time: minutesToHHMM(asr), date: minutesToDate(asr, baseDate) },
    { key: 'aksam', label: 'Akşam', time: minutesToHHMM(sunset), date: minutesToDate(sunset, baseDate) },
    { key: 'yatsi', label: 'Yatsı', time: minutesToHHMM(isha), date: minutesToDate(isha, baseDate) },
  ];
}

/**
 * Find the next prayer from now.
 * Returns { index, prayer, remainingMs }
 */
export function getNextPrayer(prayers, now = new Date()) {
  for (let i = 0; i < prayers.length; i++) {
    const diff = prayers[i].date.getTime() - now.getTime();
    if (diff > 0) {
      return { index: i, prayer: prayers[i], remainingMs: diff };
    }
  }
  // All prayers passed — next is tomorrow's Imsak
  // We signal this by returning null; the caller should recalculate for tomorrow
  return null;
}

/**
 * Format milliseconds as HH:MM:SS countdown string.
 */
export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
