/**
 * Ramadan mode context — shares override preference across all screens.
 * Possible values: 'auto' | 'on' | 'off'
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  getRamadanOverride,
  resolveRamadan,
  setRamadanOverride,
} from '../utils/ramadanMode';

const RamadanContext = createContext({
  ramadan: { isRamadan: false, dayOfRamadan: 0, totalDays: 0, range: null, mode: 'auto' },
  override: 'auto',
  setOverride: () => {},
});

export function RamadanProvider({ children }) {
  const [override, setOverrideState] = useState('auto');
  const [ramadan, setRamadan] = useState(() => resolveRamadan('auto'));

  // Load saved preference on mount
  useEffect(() => {
    getRamadanOverride().then((saved) => {
      setOverrideState(saved);
      setRamadan(resolveRamadan(saved));
    });
  }, []);

  const setOverride = useCallback(async (mode) => {
    setOverrideState(mode);
    setRamadan(resolveRamadan(mode));
    await setRamadanOverride(mode);
  }, []);

  return (
    <RamadanContext.Provider value={{ ramadan, override, setOverride }}>
      {children}
    </RamadanContext.Provider>
  );
}

export function useRamadan() {
  return useContext(RamadanContext);
}
