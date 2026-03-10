import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrayerTimes } from '../utils/prayerApi';

/* ── Configure notification handler ── */
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Expo Go may not support this
}

/** Turkish prayer names for notification text */
const PRAYER_LABELS = {
  imsak: 'İmsak',
  gunes: 'Güneş',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
};

const PRAYER_MESSAGES = {
  imsak: 'İmsak vakti girdi. Sahura kalkma zamanı.',
  gunes: 'Güneş doğuyor. Günaydın!',
  ogle: 'Öğle namazı vakti girdi.',
  ikindi: 'İkindi namazı vakti girdi.',
  aksam: 'Akşam namazı vakti. İftar zamanı!',
  yatsi: 'Yatsı namazı vakti girdi.',
};

/**
 * Request notification permissions.
 * Returns true if granted.
 */
export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule local notifications for all 6 prayer times today (and tomorrow).
 * Cancels all existing scheduled notifications first.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} tz  - Timezone offset (hours)
 * @param {Object} enabledPrayers - { imsak: true, gunes: false, ... } toggle per prayer
 * @param {boolean} preNotify - Whether to send a pre-notification 15 min before
 */
export async function schedulePrayerNotifications(lat, lng, tz, enabledPrayers = null, preNotify = false) {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  // Schedule for today and tomorrow to ensure coverage
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    const { prayers } = await getPrayerTimes(targetDate, lat, lng, tz);

    for (const prayer of prayers) {
      // Skip if this prayer is toggled off
      if (enabledPrayers && enabledPrayers[prayer.key] === false) continue;

      const triggerDate = prayer.date;
      // Only schedule future notifications
      if (triggerDate.getTime() <= now.getTime()) continue;

      // For day offset 1 (tomorrow), adjust the date
      if (dayOffset === 1) {
        // Since we already fetched tomorrow's prayers (targetDate.setDate(now + 1)),
        // the prayer.date returned from getPrayerTimes is ALREADY correctly tomorrow.
        // There is no need to add another day here.
      }

      const secondsUntil = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
      if (secondsUntil <= 0) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${PRAYER_LABELS[prayer.key]} Vakti`,
          body: PRAYER_MESSAGES[prayer.key] || `${PRAYER_LABELS[prayer.key]} vakti girdi.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && {
            channelId: 'prayer-times',
          }),
        },
        trigger: {
          type: 'timeInterval',
          seconds: secondsUntil,
          repeats: false,
        },
      });

      // Pre-notification (15 minutes before)
      if (preNotify) {
        const preSeconds = secondsUntil - 900; // 15 min = 900 sec
        if (preSeconds > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ ${PRAYER_LABELS[prayer.key]} — 15 dakika`,
              body: `${PRAYER_LABELS[prayer.key]} vaktine 15 dakika kaldı.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              ...(Platform.OS === 'android' && {
                channelId: 'prayer-times',
              }),
            },
            trigger: {
              type: 'timeInterval',
              seconds: preSeconds,
              repeats: false,
            },
          });
        }
      }
    }
  }

  return true;
  } catch {
    // Expo Go limitation – notifications not fully supported
    return false;
  }
}

/**
 * Cancel all prayer notifications.
 */
export async function cancelAllPrayerNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // silent
  }
}

/**
 * Setup Android notification channel (call once at app start).
 */
export async function setupNotificationChannel() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('prayer-times', {
      name: 'Ezan Vakitleri',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c8a15a',
    });
    }
  } catch {
    // Expo Go limitation
  }
}
