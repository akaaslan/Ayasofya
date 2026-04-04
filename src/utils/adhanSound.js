/**
 * Ezan / Adhan sound playback utility.
 * Uses expo-audio for audio playback.
 * Reads selected adhan from adhanPrefs (AsyncStorage).
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getSelectedAdhan } from './adhanPrefs';

let player = null;

/**
 * Configure audio mode for background playback.
 */
export async function configureAudio() {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // silent — may fail in Expo Go
  }
}

/**
 * Play ezan sound. Uses the user-selected adhan from preferences,
 * or a custom source if provided.
 *
 * @param {string|null} source - Override URL (uses preference if null)
 * @param {number} volume - 0.0 to 1.0
 */
export async function playEzan(source = null, volume = 1.0) {
  try {
    await stopEzan();
    await configureAudio();

    let audioSource = source;
    if (!audioSource) {
      const adhan = await getSelectedAdhan();
      audioSource = adhan.url;
    }

    // Use { uri } object format for remote URLs
    const src = typeof audioSource === 'string' ? { uri: audioSource } : audioSource;

    player = createAudioPlayer(src, { downloadFirst: true });
    player.volume = volume;
    player.play();

    return true;
  } catch (e) {
    console.warn('Ezan playback error:', e.message);
    return false;
  }
}

/**
 * Stop currently playing ezan sound.
 */
export async function stopEzan() {
  try {
    if (player) {
      player.pause();
      player.release();
      player = null;
    }
  } catch {
    player = null;
  }
}

/**
 * Check if ezan is currently playing.
 */
export function isEzanPlaying() {
  return player?.playing ?? false;
}

/**
 * Play adhan sound for notification (uses selected adhan preference).
 */
export async function playNotificationSound() {
  try {
    await playEzan(null, 0.8);
  } catch (e) {
    console.warn('Notification sound error:', e.message);
  }
}
