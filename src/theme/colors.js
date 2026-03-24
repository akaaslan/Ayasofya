/**
 * Mutable color palette singleton.
 * ThemeContext calls _syncColors() whenever the active palette changes.
 * Components that import `colors` will read the latest values on each render,
 * provided they subscribe to theme changes via useTheme().
 */
export const colors = {
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

/** Update the singleton in-place so every import sees the new palette. */
export function _syncColors(palette) {
  if (!palette) return;
  Object.keys(colors).forEach((k) => {
    if (palette[k] !== undefined) colors[k] = palette[k];
  });
}
