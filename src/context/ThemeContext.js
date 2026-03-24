import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { _syncColors } from '../theme/colors';

const STORAGE_KEY = '@ayasofya_theme';

/* ── Palettes ── */
const emerald = {
  key: 'emerald',
  backgroundTop: '#061e1a',
  backgroundBottom: '#031513',
  backgroundCard: '#0a2e28',
  panel: '#0a2622',
  panelMuted: '#0d2f29',
  textPrimary: '#f0ead2',
  textSecondary: '#a6b59b',
  textMuted: '#6b8070',
  accent: '#c8a15a',
  accentSoft: '#80643b',
  accentGlow: '#cfac63',
  navInactive: '#8b9f8f',
  divider: 'rgba(200, 161, 90, 0.18)',
  ringBase: 'rgba(200, 161, 90, 0.20)',
  activeRow: 'rgba(84, 106, 54, 0.25)',
  white: '#ffffff',
};

const turquoise = {
  key: 'turquoise',
  backgroundTop: '#081e24',
  backgroundBottom: '#041518',
  backgroundCard: '#0a2e38',
  panel: '#0a2630',
  panelMuted: '#0d2f38',
  textPrimary: '#e8f0f0',
  textSecondary: '#8fb8c0',
  textMuted: '#5a8a90',
  accent: '#4dc9c0',
  accentSoft: '#2a7a74',
  accentGlow: '#5cd6cc',
  navInactive: '#6a9aa0',
  divider: 'rgba(77, 201, 192, 0.18)',
  ringBase: 'rgba(77, 201, 192, 0.20)',
  activeRow: 'rgba(40, 120, 115, 0.25)',
  white: '#ffffff',
};

const purple = {
  key: 'purple',
  backgroundTop: '#1a1028',
  backgroundBottom: '#0f0a1a',
  backgroundCard: '#261838',
  panel: '#201434',
  panelMuted: '#28183d',
  textPrimary: '#ece4f8',
  textSecondary: '#b09cc8',
  textMuted: '#7a6898',
  accent: '#c084fc',
  accentSoft: '#7c4dba',
  accentGlow: '#d098ff',
  navInactive: '#8a78a8',
  divider: 'rgba(192, 132, 252, 0.18)',
  ringBase: 'rgba(192, 132, 252, 0.20)',
  activeRow: 'rgba(100, 60, 150, 0.25)',
  white: '#ffffff',
};

const burgundy = {
  key: 'burgundy',
  backgroundTop: '#1e0a14',
  backgroundBottom: '#14070e',
  backgroundCard: '#2e1420',
  panel: '#26101c',
  panelMuted: '#301424',
  textPrimary: '#f4e6ec',
  textSecondary: '#c8a0b0',
  textMuted: '#8a6070',
  accent: '#e87498',
  accentSoft: '#a04868',
  accentGlow: '#f088a8',
  navInactive: '#a07888',
  divider: 'rgba(232, 116, 152, 0.18)',
  ringBase: 'rgba(232, 116, 152, 0.20)',
  activeRow: 'rgba(140, 50, 80, 0.25)',
  white: '#ffffff',
};

const navy = {
  key: 'navy',
  backgroundTop: '#0a1428',
  backgroundBottom: '#060e1c',
  backgroundCard: '#122040',
  panel: '#0e1a36',
  panelMuted: '#141f3e',
  textPrimary: '#e6eaf4',
  textSecondary: '#98a8c8',
  textMuted: '#5e7098',
  accent: '#6ea8fe',
  accentSoft: '#3a68b8',
  accentGlow: '#82b8ff',
  navInactive: '#7088b0',
  divider: 'rgba(110, 168, 254, 0.18)',
  ringBase: 'rgba(110, 168, 254, 0.20)',
  activeRow: 'rgba(50, 80, 140, 0.25)',
  white: '#ffffff',
};

const light = {
  key: 'light',
  backgroundTop: '#f5f0e8',
  backgroundBottom: '#ebe5dc',
  backgroundCard: '#ffffff',
  panel: '#faf7f2',
  panelMuted: '#f0ece4',
  textPrimary: '#1a1a1a',
  textSecondary: '#555555',
  textMuted: '#888888',
  accent: '#b08830',
  accentSoft: '#c8a858',
  accentGlow: '#a07820',
  navInactive: '#999999',
  divider: 'rgba(0, 0, 0, 0.08)',
  ringBase: 'rgba(176, 136, 48, 0.20)',
  activeRow: 'rgba(176, 136, 48, 0.10)',
  white: '#ffffff',
};

const ramadan = {
  key: 'ramadan',
  backgroundTop: '#0c1a2e',
  backgroundBottom: '#06101e',
  backgroundCard: '#142440',
  panel: '#102038',
  panelMuted: '#162842',
  textPrimary: '#f2edd8',
  textSecondary: '#b8a880',
  textMuted: '#7a6e50',
  accent: '#d4a840',
  accentSoft: '#9a7828',
  accentGlow: '#e0b848',
  navInactive: '#8a7e60',
  divider: 'rgba(212, 168, 64, 0.18)',
  ringBase: 'rgba(212, 168, 64, 0.20)',
  activeRow: 'rgba(140, 110, 40, 0.25)',
  white: '#ffffff',
};

export const PALETTES = { emerald, turquoise, purple, burgundy, navy, light, ramadan };

export const THEME_LIST = [
  { key: 'emerald', label: 'Zümrüt', color: '#061e1a' },
  { key: 'turquoise', label: 'Turkuaz', color: '#081e24' },
  { key: 'purple', label: 'Mor', color: '#1a1028' },
  { key: 'burgundy', label: 'Bordo', color: '#1e0a14' },
  { key: 'navy', label: 'Lacivert', color: '#0a1428' },
  { key: 'light', label: 'Açık', color: '#f5f0e8' },
];

const ThemeContext = createContext();

export function ThemeProvider({ children, ramadanActive = false }) {
  const [themeKey, setThemeKey] = useState('emerald');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && PALETTES[v]) setThemeKey(v);
      setReady(true);
    });
  }, []);

  const changeTheme = useCallback(async (key) => {
    if (PALETTES[key]) {
      setThemeKey(key);
      await AsyncStorage.setItem(STORAGE_KEY, key);
    }
  }, []);

  // Override with ramadan palette when Ramadan mode is active
  const effectiveTheme = ramadanActive ? ramadan : (PALETTES[themeKey] || emerald);

  // Sync the mutable colors singleton BEFORE children render (not in useEffect)
  _syncColors(effectiveTheme);

  return (
    <ThemeContext.Provider value={{ theme: effectiveTheme, themeKey, changeTheme, ready, ramadanActive }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
