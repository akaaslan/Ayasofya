import { useCallback, useEffect, useRef, useState } from 'react';

import {
  calculatePrayerTimes,
  formatCountdown,
  getNextPrayer,
} from '../utils/prayerCalculation';
import { getPrayerTimes } from '../utils/prayerApi';

/**
 * Core hook – provides live prayer times, next prayer, and countdown.
 *
 * Data flow:
 *   1. On mount → render with local calculation (sync, instant)
 *   2. Immediately fire async API fetch → replace prayers with API data
 *   3. Every second → only update countdown / progress (no re-fetch)
 *   4. At midnight → re-fetch for new day
 *
 * Returns `prayerSource`: 'api' | 'cache' | 'local'
 */
export function usePrayerTimes(lat, lng, timezone) {
  const [prayers, setPrayers] = useState([]);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [countdown, setCountdown] = useState('00:00:00');
  const [progress, setProgress] = useState(0);        // 0→1 progress toward next prayer
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerSource, setPrayerSource] = useState('local');
  const intervalRef = useRef(null);
  const lastDateKeyRef = useRef('');
  const prayersRef = useRef([]);
  const tomorrowPrayersRef = useRef([]);

  /* ── Sync compute (instant, for fallback + initial render) ── */
  const computeSync = useCallback(
    (date) => calculatePrayerTimes(date, lat, lng, timezone),
    [lat, lng, timezone],
  );

  /* ── Async fetch: cache → API → local fallback ── */
  const loadPrayers = useCallback(async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const [todayResult, tomorrowResult] = await Promise.all([
        getPrayerTimes(now, lat, lng, timezone),
        getPrayerTimes(tomorrow, lat, lng, timezone),
      ]);
      prayersRef.current = todayResult.prayers;
      tomorrowPrayersRef.current = tomorrowResult.prayers;
      setPrayers(todayResult.prayers);
      setPrayerSource(todayResult.source);
    } catch {
      // Should not happen (getPrayerTimes always falls back), but be safe
      const local = computeSync(now);
      prayersRef.current = local;
      setPrayers(local);
      setPrayerSource('local');
    }

    lastDateKeyRef.current = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }, [lat, lng, timezone, computeSync]);

  /* ── Initial load: sync render + async upgrade ── */
  useEffect(() => {
    // Immediate sync data so the UI is never blank
    const now = new Date();
    const syncPrayers = computeSync(now);
    prayersRef.current = syncPrayers;
    setPrayers(syncPrayers);

    // Fire async fetch to upgrade
    loadPrayers();
  }, [computeSync, loadPrayers]);

  /* ── 1-second countdown tick ── */
  useEffect(() => {
    function tick() {
      const now = new Date();
      setCurrentTime(now);

      // Midnight rollover → re-fetch
      const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (lastDateKeyRef.current && dateKey !== lastDateKeyRef.current) {
        loadPrayers();
      }

      const todayPrayers = prayersRef.current;
      if (!todayPrayers.length) return;

      let next = getNextPrayer(todayPrayers, now);

      if (!next) {
        // All today's prayers passed → use tomorrow's
        const tmrw = tomorrowPrayersRef.current;
        if (tmrw.length) {
          next = getNextPrayer(tmrw, now);
          if (next) {
            next = { ...next, prayer: tmrw[next.index] };
          }
        }
      }

      setPrayers(todayPrayers);

      if (next) {
        setNextPrayer(next.prayer);
        setActiveIndex(next.index);
        setCountdown(formatCountdown(next.remainingMs));

        const prevIdx = next.index - 1;
        let prevTime;
        if (prevIdx >= 0) {
          prevTime = todayPrayers[prevIdx].date.getTime();
        } else {
          const midnight = new Date(now);
          midnight.setHours(0, 0, 0, 0);
          prevTime = midnight.getTime();
        }
        const nextTime = next.prayer.date.getTime();
        const total = nextTime - prevTime;
        const elapsed = now.getTime() - prevTime;
        setProgress(total > 0 ? Math.min(Math.max(elapsed / total, 0), 1) : 0);
      } else {
        setCountdown('00:00:00');
        setNextPrayer(null);
        setActiveIndex(-1);
        setProgress(0);
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadPrayers]);

  return { prayers, nextPrayer, activeIndex, countdown, progress, currentTime, prayerSource };
}
