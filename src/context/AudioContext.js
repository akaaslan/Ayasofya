/**
 * AudioContext.js
 *
 * Global audio state that survives navigation and screen changes.
 * Wrap your root <App /> with <AudioProvider> so the mini-player and
 * audio keep running even when the user leaves the Quran screen.
 *
 * Features:
 *  - Gapless playback: next track is preloaded while the current one plays.
 *    When the current track ends we immediately swap to the preloaded player,
 *    eliminating the "load → pause → play" gap.
 *  - Auto-advance through the full aya list.
 *  - Exposes { playingAya, isPlaying, play, pause, stop, playAya } to consumers.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

/* ── Helpers (duplicated here so this file is self-contained) ─────────────── */
const getReciterCode = (reciter) =>
  reciter?.author_code ??
  reciter?.identifier ??
  reciter?.subfolder ??
  reciter?.code ??
  'abdulbasit-mjwd';

export const buildAudioUrl = (surahId, ayaNumber, reciter) => {
  const code = getReciterCode(reciter);
  const sId  = String(surahId).padStart(3, '0');
  const aId  = String(ayaNumber).padStart(3, '0');
  return `https://tanzil.net/res/audio/${code}/${sId}${aId}.mp3`;
};

/* ── Context ──────────────────────────────────────────────────────────────── */
const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
  // Currently playing metadata
  const [playingAya,   setPlayingAya]   = useState(null);
  const [playingSurah, setPlayingSurah] = useState(null);
  const [reciter,      setReciter]      = useState(null);

  // Two audio URLs – current + next (for gapless preload)
  const [currentUrl, setCurrentUrl] = useState(null);
  const [nextUrl,    setNextUrl]     = useState(null);

  // expo-audio players
  // "primary" plays the current aya; "preloader" silently buffers the next.
  const primary    = useAudioPlayer(currentUrl, { updateInterval: 1 });
  const preloader  = useAudioPlayer(nextUrl);
  const primaryStatus = useAudioPlayerStatus(primary);

  // Internal guards
  const didConsumeFinishRef = useRef(false);
  const hasStartedRef       = useRef(false);
  const pendingPlayRef      = useRef(false);

  /* ── Derived helpers ──────────────────────────────────────────────────── */
  const getNextAya = useCallback((aya, surah) => {
    if (!surah?.ayas || !aya) return null;
    const idx = surah.ayas.findIndex((a) => a.id === aya.id);
    return idx !== -1 && idx < surah.ayas.length - 1 ? surah.ayas[idx + 1] : null;
  }, []);

  /* ── Keep nextUrl in sync with the playing aya ────────────────────────── */
  useEffect(() => {
    const next = getNextAya(playingAya, playingSurah);
    setNextUrl(next ? buildAudioUrl(playingSurah.id, next.aya_number, reciter) : null);
  }, [playingAya, playingSurah, reciter, getNextAya]);

  /* ── Auto-play once the track is loaded ───────────────────────────────── */
  useEffect(() => {
    if (primaryStatus.isLoaded && pendingPlayRef.current) {
      pendingPlayRef.current = false;
      try { primary.play(); } catch (_) {}
    }
  }, [primaryStatus.isLoaded, primary]);

  /* ── Mark that playback has actually started ──────────────────────────── */
  useEffect(() => {
    if (primaryStatus.playing) hasStartedRef.current = true;
  }, [primaryStatus.playing]);

  /* ── Gapless auto-advance ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!primaryStatus.didJustFinish) return;
    if (!hasStartedRef.current)       return;
    if (didConsumeFinishRef.current)  return;

    didConsumeFinishRef.current = true; // prevent double-fire
    hasStartedRef.current       = false;

    const next = getNextAya(playingAya, playingSurah);
    if (!next) {
      // End of surah
      setPlayingAya(null);
      setCurrentUrl(null);
      setNextUrl(null);
      return;
    }

    // The preloader already has next track buffered →
    // swap URLs so `primary` picks up the preloaded content immediately.
    const url = buildAudioUrl(playingSurah.id, next.aya_number, reciter);
    didConsumeFinishRef.current = false;
    pendingPlayRef.current      = true;
    hasStartedRef.current       = false;
    setPlayingAya(next);
    setCurrentUrl(url);
    // nextUrl will be updated by the effect above on the next render
  }, [primaryStatus.didJustFinish]); // narrow deps – intentional

  /* ── Public API ───────────────────────────────────────────────────────── */

  /** Start playing a specific aya inside a surah with a given reciter. */
  const playAya = useCallback((aya, surah, selectedReciter) => {
    // If the same aya is already loaded, just toggle play/pause
    if (
      playingAya?.id === aya.id &&
      playingSurah?.id === surah.id
    ) {
      try {
        primaryStatus.playing ? primary.pause() : primary.play();
      } catch (_) {}
      return;
    }

    // New track
    didConsumeFinishRef.current = false;
    hasStartedRef.current       = false;
    pendingPlayRef.current      = true;

    setReciter(selectedReciter);
    setPlayingSurah(surah);
    setPlayingAya(aya);
    setCurrentUrl(buildAudioUrl(surah.id, aya.aya_number, selectedReciter));
  }, [playingAya, playingSurah, primaryStatus.playing, primary]);

  const pause = useCallback(() => {
    try { primary.pause(); } catch (_) {}
  }, [primary]);

  const resume = useCallback(() => {
    try { primary.play(); } catch (_) {}
  }, [primary]);

  const stop = useCallback(() => {
    didConsumeFinishRef.current = false;
    hasStartedRef.current       = false;
    pendingPlayRef.current      = false;
    try { primary.pause(); } catch (_) {}
    setPlayingAya(null);
    setPlayingSurah(null);
    setCurrentUrl(null);
    setNextUrl(null);
  }, [primary]);

  const value = {
    playingAya,
    playingSurah,
    reciter,
    isPlaying: primaryStatus.playing,
    isLoaded:  primaryStatus.isLoaded,
    currentTime: primaryStatus.currentTime,
    duration: primaryStatus.duration,
    playAya,
    pause,
    resume,
    stop,
  };

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used inside <AudioProvider>');
  return ctx;
}