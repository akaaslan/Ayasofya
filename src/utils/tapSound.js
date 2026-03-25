/**
 * Tap/click sound for dhikr counter.
 * Generates a tiny WAV click on first use, caches it, and plays via expo-audio.
 */
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

const CLICK_PATH = FileSystem.cacheDirectory + 'tap_click.wav';
let player = null;

/** Build a minimal 8-bit mono WAV click (25 ms at 8 kHz). */
function buildClickWav() {
  const rate = 8000;
  const numSamples = 200; // 25 ms
  const buf = new Uint8Array(44 + numSamples);

  // ─ RIFF header ─
  const set4 = (o, s) => { for (let i = 0; i < 4; i++) buf[o + i] = s.charCodeAt(i); };
  const setU32 = (o, v) => { buf[o]=v&0xff; buf[o+1]=(v>>8)&0xff; buf[o+2]=(v>>16)&0xff; buf[o+3]=(v>>24)&0xff; };
  const setU16 = (o, v) => { buf[o]=v&0xff; buf[o+1]=(v>>8)&0xff; };

  set4(0, 'RIFF');
  setU32(4, 36 + numSamples);
  set4(8, 'WAVE');
  set4(12, 'fmt ');
  setU32(16, 16);       // subchunk size
  setU16(20, 1);        // PCM
  setU16(22, 1);        // mono
  setU32(24, rate);
  setU32(28, rate);     // byte rate
  setU16(32, 1);        // block align
  setU16(34, 8);        // 8-bit
  set4(36, 'data');
  setU32(40, numSamples);

  // ─ Click waveform (unsigned 8-bit, 128 = silence) ─
  for (let i = 0; i < numSamples; i++) {
    if (i < 16) {
      const amp = Math.floor(120 * Math.exp(-i * 0.35));
      buf[44 + i] = 128 + amp * (i % 2 === 0 ? 1 : -1);
    } else {
      buf[44 + i] = 128;
    }
  }
  return buf;
}

async function ensureFile() {
  const info = await FileSystem.getInfoAsync(CLICK_PATH);
  if (info.exists) return;
  const bytes = buildClickWav();
  const binary = String.fromCharCode(...bytes);
  const b64 = btoa(binary);
  await FileSystem.writeAsStringAsync(CLICK_PATH, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** Play the tap click sound once. Safe to call rapidly. */
export async function playTapSound() {
  try {
    await ensureFile();
    if (player) {
      player.seekTo(0);
      player.play();
    } else {
      player = createAudioPlayer(CLICK_PATH);
      player.volume = 0.6;
      player.play();
    }
  } catch (e) {
    console.warn('Tap sound error:', e.message);
  }
}
