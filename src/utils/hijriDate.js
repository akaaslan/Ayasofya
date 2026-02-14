/**
 * Gregorian → Hijri (Islamic) calendar conversion.
 * Uses the Umm al-Qura approximation algorithm.
 */

const HIJRI_MONTHS = [
  'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir',
  'Cemaziyelevvel', 'Cemaziyelahir', 'Recep', 'Şaban',
  'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce',
];

export function gregorianToHijri(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  // Julian Day Number
  let jd;
  if (m > 2) {
    jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d - 1524.5;
  } else {
    jd = Math.floor(365.25 * (y - 1 + 4716)) + Math.floor(30.6001 * (m + 12 + 1)) + d - 1524.5;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  jd += B;

  // Shift to Islamic epoch
  const l = Math.floor(jd - 1948439.5) + 10632;
  const n = Math.floor((l - 1) / 10631);
  const remainder = l - 10631 * n + 354;
  const j = Math.floor((10985 - remainder) / 5316) *
    Math.floor((50 * remainder) / 17719) +
    Math.floor(remainder / 5670) *
    Math.floor((43 * remainder) / 15238);
  const remaining = remainder - Math.floor((30 - j) / 15) *
    Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) *
    Math.floor((15238 * j) / 43) + 29;

  const hijriMonth = Math.floor((24 * remaining) / 709);
  const hijriDay = remaining - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  return {
    day: hijriDay,
    month: hijriMonth,  // 1-based
    year: hijriYear,
    monthName: HIJRI_MONTHS[hijriMonth - 1] || '',
  };
}

/**
 * Check if current Hijri month is Ramadan and return the day.
 * Otherwise returns formatted "day MonthName year" string.
 */
export function getHijriDisplayString(date = new Date()) {
  const h = gregorianToHijri(date);
  if (h.month === 9) {
    return `${h.day} RAMAZAN`;
  }
  return `${h.day} ${h.monthName.toUpperCase()}`;
}
