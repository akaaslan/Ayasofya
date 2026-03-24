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
  imsak: 'İmsak vakti girdi.',
  gunes: 'Güneş doğuyor. Günaydın!',
  ogle: 'Öğle namazı vakti girdi.',
  ikindi: 'İkindi namazı vakti girdi.',
  aksam: 'Akşam namazı vakti girdi.',
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

  const now = new Date();
  const scheduled = [];

  // Schedule for today and tomorrow to ensure coverage
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    let prayers;
    try {
      const result = await getPrayerTimes(targetDate, lat, lng, tz);
      prayers = result.prayers;
    } catch {
      continue; // skip this day if fetch fails, don't lose existing notifications
    }

    for (const prayer of prayers) {
      // Skip if this prayer is toggled off
      if (enabledPrayers && enabledPrayers[prayer.key] === false) continue;

      const triggerDate = prayer.date;
      // Only schedule future notifications
      if (triggerDate.getTime() <= now.getTime()) continue;

      const secondsUntil = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
      if (secondsUntil <= 0) continue;

      try {
        const id = await Notifications.scheduleNotificationAsync({
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
        scheduled.push(id);
      } catch {
        // individual schedule failed, continue with others
      }

      // Pre-notification (15 minutes before)
      if (preNotify) {
        const preSeconds = secondsUntil - 900; // 15 min = 900 sec
        if (preSeconds > 0) {
          try {
            const preId = await Notifications.scheduleNotificationAsync({
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
            scheduled.push(preId);
          } catch {
            // individual pre-notification failed, continue
          }
        }
      }
    }
  }

  // Only cancel old notifications AFTER new ones are successfully scheduled
  // Get all currently scheduled, remove any that are NOT in our new batch
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const newIdSet = new Set(scheduled);
    for (const n of existing) {
      if (!newIdSet.has(n.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // fallback: if selective cancel fails, do bulk cancel + keep new ones
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
      await Notifications.setNotificationChannelAsync('kaza-reminder', {
        name: 'Kaza Hatırlatma',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }
  } catch {
    // Expo Go limitation
  }
}

/** Keys that are trackable for kaza reminder (5 farz prayers mapped) */
const KAZA_PRAYER_MAP = {
  imsak: 'İmsak (Sabah)',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
};

/**
 * Schedule "Did you pray?" Kaza reminder notifications
 * 1 hour after each trackable prayer time.
 */
export async function scheduleKazaReminders(lat, lng, tz) {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    const now = new Date();
    const scheduled = [];

    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      let prayers;
      try {
        const result = await getPrayerTimes(targetDate, lat, lng, tz);
        prayers = result.prayers;
      } catch {
        continue;
      }

      for (const prayer of prayers) {
        if (!KAZA_PRAYER_MAP[prayer.key]) continue;

        const reminderTime = new Date(prayer.date.getTime() + 60 * 60 * 1000); // +1 hour
        if (reminderTime.getTime() <= now.getTime()) continue;

        const secondsUntil = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);
        if (secondsUntil <= 0) continue;

        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🤲 ${KAZA_PRAYER_MAP[prayer.key]} namazını kıldınız mı?`,
              body: 'Namaz takibinizi güncelleyin.',
              sound: true,
              data: { type: 'kaza_reminder', prayerKey: prayer.key },
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              ...(Platform.OS === 'android' && {
                channelId: 'kaza-reminder',
              }),
            },
            trigger: {
              type: 'timeInterval',
              seconds: secondsUntil,
              repeats: false,
            },
          });
          scheduled.push(id);
        } catch {
          // continue
        }
      }
    }
    return scheduled.length > 0;
  } catch {
    return false;
  }
}
