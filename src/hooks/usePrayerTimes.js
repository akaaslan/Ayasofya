import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

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
 *   5. On AppState resume → re-fetch if date changed
 *
 * Returns `prayerSource`: 'api' | 'cache' | 'local'
 */
export function usePrayerTimes(lat, lng, timezone) {
  const [prayers, setPrayers] = useState([]);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [countdown, setCountdown] = useState('00:00:00');
  const [hicri, setHicri] = useState(null);
  const [progress, setProgress] = useState(0);        // 0→1 progress toward next prayer
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerSource, setPrayerSource] = useState('local');
  const intervalRef = useRef(null);
  const lastDateKeyRef = useRef('');
  const prayersRef = useRef([]);
  const tomorrowPrayersRef = useRef([]);
  const fetchingRef = useRef(false); // prevent concurrent fetches (midnight dedup)

  /* ── Memoized next-prayer cache ── */
  const lastNextRef = useRef({ index: -1, key: '', remainingMs: 0 });

  /* ── Sync compute (instant, for fallback + initial render) ── */
  const computeSync = useCallback(
    (date) => calculatePrayerTimes(date, lat, lng, timezone),
    [lat, lng, timezone],
  );

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ── Async fetch: cache → API → local fallback ── */
  const loadPrayers = useCallback(async () => {
    if (fetchingRef.current) return; // prevent double-fetch at midnight
    fetchingRef.current = true;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const [todayResult, tomorrowResult] = await Promise.all([
        getPrayerTimes(now, lat, lng, timezone),
        getPrayerTimes(tomorrow, lat, lng, timezone),
      ]);
      if (!mountedRef.current) return;
      prayersRef.current = todayResult.prayers;
      tomorrowPrayersRef.current = tomorrowResult.prayers;
      setPrayers(todayResult.prayers);
      setHicri(todayResult.hicri);
      setPrayerSource(todayResult.source);
    } catch {
      if (!mountedRef.current) return;
      const local = computeSync(now);
      prayersRef.current = local;
      setPrayers(local);
      setPrayerSource('local');
    } finally {
      fetchingRef.current = false;
    }

    lastDateKeyRef.current = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }, [lat, lng, timezone, computeSync]);

  /* ── Clear stale prayers when location changes, then fetch ── */
  useEffect(() => {
    let cancelled = false;

    // Immediate sync data so the UI is never blank
    const now = new Date();
    const syncPrayers = computeSync(now);
    prayersRef.current = syncPrayers;
    tomorrowPrayersRef.current = [];
    setPrayers(syncPrayers);
    setPrayerSource('local');
    lastNextRef.current = { index: -1, key: '', remainingMs: 0 };

    // Fire async fetch to upgrade
    loadPrayers().then(() => {
      if (cancelled) return;
    });

    return () => { cancelled = true; };
  }, [computeSync, loadPrayers]);

  /* ── App resume → refresh if stale ── */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        if (lastDateKeyRef.current && dateKey !== lastDateKeyRef.current) {
          loadPrayers();
        }
      }
    });
    return () => sub.remove();
  }, [loadPrayers]);

  /* ── 1-second countdown tick ── */
  useEffect(() => {
    function tick() {
      const now = new Date();
      setCurrentTime(now);

      // Midnight rollover → re-fetch (deduplicated via fetchingRef)
      const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (lastDateKeyRef.current && dateKey !== lastDateKeyRef.current) {
        loadPrayers();
      }

      const todayPrayers = prayersRef.current;
      if (!todayPrayers.length) return;

      // Memoized: skip full scan if same prayer is still next
      const cached = lastNextRef.current;
      let next;
      const nowMs = now.getTime();

      if (cached.index >= 0 && cached.remainingMs > 2000) {
        // Quick check — is the cached prayer still in the future?
        const prayerArr = cached.fromTomorrow ? tomorrowPrayersRef.current : todayPrayers;
        const p = prayerArr[cached.index];
        if (p && p.date.getTime() > nowMs) {
          next = { prayer: p, index: cached.index, remainingMs: p.date.getTime() - nowMs };
        }
      }

      if (!next) {
        next = getNextPrayer(todayPrayers, now);
        if (next) {
          lastNextRef.current = { index: next.index, key: next.prayer.key, remainingMs: next.remainingMs, fromTomorrow: false };
        } else {
          // All today's prayers passed → use tomorrow's
          const tmrw = tomorrowPrayersRef.current;
          if (tmrw.length) {
            next = getNextPrayer(tmrw, now);
            if (next) {
              next = { ...next, prayer: tmrw[next.index] };
              lastNextRef.current = { index: next.index, key: next.prayer.key, remainingMs: next.remainingMs, fromTomorrow: true };
            }
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
          prevTime = next.prayer === tomorrowPrayersRef.current[0] 
            ? todayPrayers[todayPrayers.length - 1].date.getTime()
            : todayPrayers[prevIdx].date.getTime();
        } else {
          const midnight = new Date(now);
          midnight.setHours(0, 0, 0, 0);
          prevTime = midnight.getTime();
        }
        const nextTime = next.prayer.date.getTime();
        const total = nextTime - prevTime;
        const elapsed = nowMs - prevTime;
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

  return { prayers, tomorrowPrayers: tomorrowPrayersRef.current, nextPrayer, activeIndex, countdown, progress, currentTime, prayerSource, hicri };
}
