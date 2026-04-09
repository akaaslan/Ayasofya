import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrayerTimes } from '../utils/prayerApi';
import { setDayPrayer, getDayTracking } from '../utils/prayerTracking';
import { incrementKaza } from '../utils/kazaTracking';
import { playNotificationSound } from '../utils/adhanSound';
import { getNotificationPrefs } from '../utils/notificationPrefs';
import { getKazaReminderEnabled } from '../utils/preferences';

/* ── Configure notification handler — play adhan when prayer notification fires ── */
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification?.request?.content?.data;
      const isPrayer = !data?.type || data?.type === 'prayer_time';
      // Play adhan sound for prayer notifications if sound is enabled
      if (isPrayer) {
        try {
          const prefs = await getNotificationPrefs();
          if (prefs.soundEnabled) {
            playNotificationSound();
          }
        } catch {}
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: false, // we handle sound ourselves via expo-audio
        shouldSetBadge: false,
      };
    },
  });
} catch {
  // Expo Go may not support this
}

/* ── Notification action category for prayer tracking ── */
try {
  Notifications.setNotificationCategoryAsync('prayer_tracking', [
    { identifier: 'PRAYED_YES', buttonTitle: '✅ Evet', options: { opensAppToForeground: true } },
    { identifier: 'PRAYED_NO', buttonTitle: '❌ Hayır', options: { opensAppToForeground: true } },
  ]);
} catch {
  // Expo Go may not support this
}

/* ── Handle notification action responses ── */
let _responseListener = null;

/** Map notification prayerKey (imsak) to kaza prayerKey (sabah) */
const NOTIF_TO_KAZA_KEY = {
  imsak: 'sabah',
  ogle: 'ogle',
  ikindi: 'ikindi',
  aksam: 'aksam',
  yatsi: 'yatsi',
};

export function setupNotificationResponseListener() {
  if (_responseListener) return;
  _responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { actionIdentifier, notification } = response;
    const data = notification?.request?.content?.data;
    const notificationId = notification?.request?.identifier;

    if (!data || data.type !== 'kaza_reminder') return;

    const prayerKey = data.prayerKey;
    if (!prayerKey) return;

    try {
      if (actionIdentifier === 'PRAYED_YES') {
        await setDayPrayer(prayerKey, true, new Date());
      } else if (actionIdentifier === 'PRAYED_NO') {
        await setDayPrayer(prayerKey, false, new Date());
        const kazaKey = NOTIF_TO_KAZA_KEY[prayerKey];
        if (kazaKey) {
          await incrementKaza(kazaKey, 1);
        }
      }
    } catch {}

    // Dismiss the notification after handling
    if (notificationId) {
      try {
        await Notifications.dismissNotificationAsync(notificationId);
      } catch {}
    }
  });
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

  // Cancel old notifications before scheduling new ones
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}

  const now = new Date();
  const scheduled = [];

  // Schedule only for today; tomorrow's will be scheduled at midnight or next app open
  for (let dayOffset = 0; dayOffset <= 0; dayOffset++) {
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

  // Also schedule kaza reminders if enabled
  try {
    const kazaEnabled = await getKazaReminderEnabled();
    if (kazaEnabled) {
      await _scheduleKazaRemindersInternal(lat, lng, tz);
    }
  } catch {}

  // Schedule end-of-day summary
  try {
    const kazaEnabled = await getKazaReminderEnabled();
    if (kazaEnabled) {
      await _scheduleEndOfDaySummary();
    }
  } catch {}

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
 * Internal: schedule kaza reminders without cancelling existing notifications.
 * Called from schedulePrayerNotifications after prayer notifs are scheduled.
 */
async function _scheduleKazaRemindersInternal(lat, lng, tz) {
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
            body: 'Evet veya Hayır ile cevaplayın.',
            sound: true,
            categoryIdentifier: 'prayer_tracking',
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
}

/**
 * Schedule "Did you pray?" Kaza reminder notifications
 * 1 hour after each trackable prayer time.
 */
export async function scheduleKazaReminders(lat, lng, tz) {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;
    return _scheduleKazaRemindersInternal(lat, lng, tz);
  } catch {
    return false;
  }
}

/**
 * Internal: schedule end-of-day summary notification at 23:00.
 * Shows which prayers were missed today.
 */
async function _scheduleEndOfDaySummary() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(23, 0, 0, 0);

  // If 23:00 already passed today, skip (tomorrow's will be scheduled on next run)
  if (target.getTime() <= now.getTime()) return;

  const secondsUntil = Math.floor((target.getTime() - now.getTime()) / 1000);
  if (secondsUntil <= 0) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Günlük Namaz Özeti',
        body: 'Bugün kılmadığınız namazları kontrol edin.',
        sound: true,
        data: { type: 'daily_summary' },
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
  } catch {}
}

/**
 * Schedule end-of-day summary (public, for use from SettingsScreen/background).
 */
export async function scheduleEndOfDaySummary() {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;
    await _scheduleEndOfDaySummary();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fire test kaza reminder notifications + end-of-day summary.
 */
export async function sendTestNotifications() {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return false;

  const prayers = Object.keys(KAZA_PRAYER_MAP);

  for (let i = 0; i < prayers.length; i++) {
    const key = prayers[i];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🤲 ${KAZA_PRAYER_MAP[key]} namazını kıldınız mı? (Test)`,
        body: 'Evet veya Hayır ile cevaplayın.',
        sound: true,
        categoryIdentifier: 'prayer_tracking',
        data: { type: 'kaza_reminder', prayerKey: key },
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        ...(Platform.OS === 'android' && {
          channelId: 'kaza-reminder',
        }),
      },
      trigger: {
        type: 'timeInterval',
        seconds: 2 + i * 3,
        repeats: false,
      },
    });
  }

  // End-of-day summary test — comes after kaza reminders
  const tracking = await getDayTracking();
  const missed = Object.keys(KAZA_PRAYER_MAP).filter(k => !tracking[k]);
  const missedNames = missed.map(k => KAZA_PRAYER_MAP[k]).join(', ');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📋 Günlük Namaz Özeti (Test)',
      body: missed.length > 0
        ? `Bugün kılınmayan namazlar: ${missedNames}`
        : 'Tebrikler! Bugün tüm namazlarınızı kıldınız. ✅',
      sound: true,
      data: { type: 'daily_summary' },
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      ...(Platform.OS === 'android' && {
        channelId: 'kaza-reminder',
      }),
    },
    trigger: {
      type: 'timeInterval',
      seconds: 2 + prayers.length * 3,
      repeats: false,
    },
  });

  return true;
}
