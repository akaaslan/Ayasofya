/**
 * Ezan / Adhan sound playback utility.
 * Uses expo-av for audio playback.
 *
 * NOTE: For a custom ezan audio, place the file in assets/ and import it.
 * Example: const EZAN_AUDIO = require('../../assets/ezan.mp3');
 */
import { Audio } from 'expo-av';

let soundObject = null;

/**
 * Configure audio mode for background playback.
 */
export async function configureAudio() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // silent — may fail in Expo Go
  }
}

/**
 * Play ezan sound from a bundled asset or URL.
 * If no custom asset is provided, falls back to a brief notification-style sound.
 *
 * @param {object|string} source - require('path') or { uri: 'https://...' }
 * @param {number} volume - 0.0 to 1.0
 */
export async function playEzan(source = null, volume = 1.0) {
  try {
    // Stop any currently playing sound
    await stopEzan();

    await configureAudio();

    const { sound } = await Audio.Sound.createAsync(
      source || { uri: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
      { shouldPlay: true, volume, isLooping: false },
    );

    soundObject = sound;

    // Auto-cleanup when finished
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        soundObject = null;
      }
    });

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
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch {
    soundObject = null;
  }
}

/**
 * Check if ezan is currently playing.
 */
export function isEzanPlaying() {
  return soundObject !== null;
}

/**
 * Play a short notification-style sound (for prayer time alert).
 */
export async function playNotificationSound() {
  try {
    await configureAudio();
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' },
      { shouldPlay: true, volume: 0.8 },
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    // silent
  }
}
