/**
 * Background Service — Ayasofya
 *
 * Runs periodically (even when app is closed) to:
 *   1. Reschedule prayer time notifications for today
 *   2. Reschedule kaza reminders
 *   3. Prefetch prayer times into SQLite cache
 *
 * Uses expo-task-manager + expo-background-fetch.
 * Highly optimized: reads location from AsyncStorage, does minimal work.
 */
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getNotificationPrefs } from './notificationPrefs';
import { schedulePrayerNotifications, scheduleKazaReminders } from './notifications';
import { prefetchPrayerTimes } from './prayerApi';

const TASK_NAME = 'AYASOFYA_PRAYER_BG_TASK';
const LOCATION_STORAGE_KEY = 'bg_location';

/* ── Location persistence (called from useLocation hook) ── */

export async function saveLocationForBackground(lat, lng, tz) {
  try {
    await AsyncStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ lat, lng, tz }),
    );
  } catch {
    // silent
  }
}

async function getStoredLocation() {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // silent
  }
  // Istanbul default
  return { lat: 41.0082, lng: 28.9784, tz: 3 };
}

/* ── Background task definition ── */

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const loc = await getStoredLocation();
    const prefs = await getNotificationPrefs();

    // Only reschedule if notifications are enabled
    if (prefs.enabled) {
      await schedulePrayerNotifications(
        loc.lat,
        loc.lng,
        loc.tz,
        prefs.prayers,
        prefs.preNotification,
      );
      await scheduleKazaReminders(loc.lat, loc.lng, loc.tz);
    }

    // Keep prayer time cache warm
    await prefetchPrayerTimes(loc.lat, loc.lng, loc.tz);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/* ── Registration (call once at app startup) ── */

export async function registerBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60, // 1 hour (Android minimum is ~15 min)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch not available (Expo Go, old devices)
  }
}

export async function unregisterBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    }
  } catch {
    // silent
  }
}
