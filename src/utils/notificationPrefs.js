/**
 * Notification preferences — per-prayer toggle, pre-notification settings.
 * Stored in AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notification_prefs';

const DEFAULT_PREFS = {
  enabled: true,
  soundEnabled: true,
  preNotification: false,       // notify X minutes before ezan
  preNotificationMinutes: 15,   // minutes before
  prayers: {
    imsak: true,
    gunes: true,
    ogle: true,
    ikindi: true,
    aksam: true,
    yatsi: true,
  },
};

/**
 * Load notification preferences.
 */
export async function getNotificationPrefs() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT_PREFS, ...saved, prayers: { ...DEFAULT_PREFS.prayers, ...saved.prayers } };
    }
    return { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Save notification preferences.
 */
export async function saveNotificationPrefs(prefs) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // silent
  }
}

/**
 * Toggle a specific prayer's notification.
 */
export async function togglePrayerNotification(prayerKey) {
  const prefs = await getNotificationPrefs();
  prefs.prayers[prayerKey] = !prefs.prayers[prayerKey];
  await saveNotificationPrefs(prefs);
  return prefs;
}

/**
 * Toggle pre-notification (reminder before ezan).
 */
export async function togglePreNotification() {
  const prefs = await getNotificationPrefs();
  prefs.preNotification = !prefs.preNotification;
  await saveNotificationPrefs(prefs);
  return prefs;
}
