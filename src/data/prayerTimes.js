/**
 * This file is no longer the source of truth for prayer times.
 * Real calculations come from src/utils/prayerCalculation.js
 * and are consumed via the usePrayerTimes hook.
 *
 * Keeping this as a reference / fallback if the calculation engine is unavailable.
 */
export const FALLBACK_PRAYER_TIMES = [
  { key: 'imsak', label: 'İmsak', time: '04:32' },
  { key: 'gunes', label: 'Güneş', time: '06:14' },
  { key: 'ogle', label: 'Öğle', time: '13:12' },
  { key: 'ikindi', label: 'İkindi', time: '16:48' },
  { key: 'aksam', label: 'Akşam', time: '19:11' },
  { key: 'yatsi', label: 'Yatsı', time: '20:36' },
];
