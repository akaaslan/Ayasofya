import { useCallback, useEffect, useRef, useState } from 'react';

import {
  calculatePrayerTimes,
  formatCountdown,
  getNextPrayer,
} from '../utils/prayerCalculation';

/**
 * Core hook – provides live prayer times, next prayer, and countdown.
 * Recalculates every second. Automatically rolls over at midnight / when all prayers pass.
 */
export function usePrayerTimes(lat, lng, timezone) {
  const [prayers, setPrayers] = useState([]);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [countdown, setCountdown] = useState('00:00:00');
  const [progress, setProgress] = useState(0);        // 0→1 progress toward next prayer
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef(null);

  const computeForDate = useCallback(
    (date) => calculatePrayerTimes(date, lat, lng, timezone),
    [lat, lng, timezone],
  );

  useEffect(() => {
    function tick() {
      const now = new Date();
      setCurrentTime(now);

      let todayPrayers = computeForDate(now);
      let next = getNextPrayer(todayPrayers, now);

      if (!next) {
        // All today's prayers have passed — look at tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowPrayers = computeForDate(tomorrow);
        next = getNextPrayer(tomorrowPrayers, now);
        if (next) {
          // Show today's prayers in the list but countdown points to tomorrow's first
          next = { ...next, prayer: tomorrowPrayers[next.index] };
        }
      }

      setPrayers(todayPrayers);

      if (next) {
        setNextPrayer(next.prayer);
        setActiveIndex(next.index);
        setCountdown(formatCountdown(next.remainingMs));

        // Calculate progress: how far through the interval we are
        // prevPrayerDate → nextPrayerDate, we are at `now`
        const prevIdx = next.index - 1;
        let prevTime;
        if (prevIdx >= 0) {
          prevTime = todayPrayers[prevIdx].date.getTime();
        } else {
          // Before first prayer — use midnight as start
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

    tick(); // run immediately
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [computeForDate]);

  return { prayers, nextPrayer, activeIndex, countdown, progress, currentTime };
}
