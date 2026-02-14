import { useEffect, useState } from 'react';

/**
 * Simple hook that returns a formatted HH:MM clock string, updated every second.
 */
export function useCurrentTime() {
  const [time, setTime] = useState(format(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function format(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
