/**
 * Tap/click sound for dhikr counter.
 * Generates a realistic wooden bead click WAV, caches it, and plays via expo-audio.
 */
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

const CLICK_PATH = FileSystem.cacheDirectory + 'bead_click.wav';
let player = null;

/** Build a realistic wooden bead click WAV (25 ms at 44100 Hz). */
function buildBeadClickWav() {
  const rate = 44100;
  const numSamples = 1102; // ~25 ms
  const dataSize = numSamples * 2;
  const buf = new Uint8Array(44 + dataSize);

  const set4 = (o, s) => { for (let i = 0; i < 4; i++) buf[o + i] = s.charCodeAt(i); };
  const setU32 = (o, v) => { buf[o]=v&0xff; buf[o+1]=(v>>8)&0xff; buf[o+2]=(v>>16)&0xff; buf[o+3]=(v>>24)&0xff; };
  const setU16 = (o, v) => { buf[o]=v&0xff; buf[o+1]=(v>>8)&0xff; };

  set4(0, 'RIFF');
  setU32(4, 36 + dataSize);
  set4(8, 'WAVE');
  set4(12, 'fmt ');
  setU32(16, 16);
  setU16(20, 1);
  setU16(22, 1);
  setU32(24, rate);
  setU32(28, rate * 2);
  setU16(32, 2);
  setU16(34, 16);
  set4(36, 'data');
  setU32(40, dataSize);

  const view = new DataView(buf.buffer, 44);
  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;

    // Ultra-fast attack + rapid decay = wooden knock character
    const attack = t < 0.0004 ? t / 0.0004 : 1;
    const decay = Math.exp(-t * 320);

    // Broadband noise burst (wood impact) — deterministic pseudo-random
    const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const noise = (seed - Math.floor(seed)) * 2 - 1;

    // Low resonance body (wood hollow thud)
    const body = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 200);

    // Mid-range knock tone
    const knock = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 400);

    // High click transient (bead-on-bead)
    const click = Math.sin(2 * Math.PI * 4200 * t) * Math.exp(-t * 600);

    // Mix: noise-heavy for realism, tonal just for warmth
    const mix = noise * 0.35 + body * 0.25 + knock * 0.25 + click * 0.15;
    const sample = Math.max(-32768, Math.min(32767, Math.round(mix * attack * decay * 26000)));
    view.setInt16(i * 2, sample, true);
  }
  return buf;
}

async function ensureFile() {
  const info = await FileSystem.getInfoAsync(CLICK_PATH);
  if (info.exists) return;
  const bytes = buildBeadClickWav();
  const binary = String.fromCharCode(...bytes);
  const b64 = btoa(binary);
  await FileSystem.writeAsStringAsync(CLICK_PATH, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** Play the bead click sound once. Safe to call rapidly. */
export async function playTapSound() {
  try {
    await ensureFile();
    if (player) {
      player.seekTo(0);
      player.play();
    } else {
      player = createAudioPlayer(CLICK_PATH);
      player.volume = 0.7;
      player.play();
    }
  } catch (e) {
    console.warn('Tap sound error:', e.message);
  }
}
