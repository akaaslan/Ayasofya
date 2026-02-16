/**
 * Islamic / Turkish religious holidays utility.
 * Uses approximate Hijri → Gregorian mappings for upcoming years.
 * In a production app this would use an astronomical Hijri calendar library.
 */

/* ── Upcoming religious holidays (Gregorian dates) ─────────── */
const HOLIDAYS = [
  // 2026
  { name: 'Regaib Kandili',       date: new Date(2026, 0, 1) },   // Jan 1 2026 (approx)
  { name: 'Miraç Kandili',        date: new Date(2026, 0, 22) },
  { name: 'Berat Kandili',        date: new Date(2026, 1, 6) },   // Feb 6
  { name: 'Ramazan Başlangıcı',   date: new Date(2026, 1, 18) },  // Feb 18
  { name: 'Kadir Gecesi',         date: new Date(2026, 2, 16) },  // Mar 16
  { name: 'Ramazan Bayramı',      date: new Date(2026, 2, 20) },  // Mar 20-22
  { name: 'Kurban Bayramı',       date: new Date(2026, 4, 27) },  // May 27-30
  { name: 'Hicri Yılbaşı',        date: new Date(2026, 5, 17) },  // Jun 17
  { name: 'Aşure Günü',           date: new Date(2026, 5, 26) },  // Jun 26
  { name: 'Mevlid Kandili',       date: new Date(2026, 7, 26) },  // Aug 26

  // 2027 (approximate)
  { name: 'Regaib Kandili',       date: new Date(2026, 11, 21) },
  { name: 'Ramazan Başlangıcı',   date: new Date(2027, 1, 8) },
  { name: 'Ramazan Bayramı',      date: new Date(2027, 2, 10) },
  { name: 'Kurban Bayramı',       date: new Date(2027, 4, 17) },
];

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

  for (const h of HOLIDAYS) {
    if (h.date >= today) {
      const diff = computeDiff(h.date, now);
      return { name: h.name, date: h.date, ...diff };
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
  return HOLIDAYS
    .filter((h) => h.date >= today)
    .map((h) => ({ name: h.name, date: h.date, ...computeDiff(h.date, now) }));
}
