/**
 * Ezan / Adhan sound playback utility.
 * Uses expo-audio for audio playback.
 *
 * NOTE: For a custom ezan audio, place the file in assets/ and import it.
 * Example: const EZAN_AUDIO = require('../../assets/ezan.mp3');
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

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
 * Play ezan sound from a bundled asset or URL.
 * If no custom asset is provided, falls back to a brief notification-style sound.
 *
 * @param {object|string} source - require('path') or 'https://...'
 * @param {number} volume - 0.0 to 1.0
 */
export async function playEzan(source = null, volume = 1.0) {
  try {
    await stopEzan();
    await configureAudio();

    const audioSource = source || 'https://www.islamcan.com/audio/adhan/azan1.mp3';
    player = createAudioPlayer(audioSource);
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
 * Play a short notification-style sound (for prayer time alert).
 */
export async function playNotificationSound() {
  try {
    await configureAudio();
    const notifPlayer = createAudioPlayer(
      'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3'
    );
    notifPlayer.volume = 0.8;
    notifPlayer.play();
  } catch (e) {
    console.warn('Notification sound error:', e.message);
  }
}
