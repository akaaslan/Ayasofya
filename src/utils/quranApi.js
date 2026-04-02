/**
 * Quran API Service — Ayasofya API (Local Backend).
 *
 * Current Backend Schema:
 *   - surahs: { id, language, name, aya_count }
 *   - ayas: { id, surah_id, aya_number, juz_number, page_number, text }
 *   - tafsirs: { id, aya_id, author, language, text }
 *
 * API Endpoints:
 *   GET /surahs?language=turkish
 *   GET /surahs/:id/ayas?language=turkish&author_code=...
 *   GET /reciters
 *   GET /tafsirs?language=turkish
 *   GET /languages
 *
 * Strategy:
 *   1. Check SQLite DB for cached data
 *   2. If not found, fetch from API and save to SQLite
 *   3. Fallback to local data (src/data/surahData.js) if API fails
 */

import { SURAHS as FALLBACK_SURAHS } from '../data/surahData';
import { getDB } from './db';

const API_BASE = 'http://192.168.1.25:8000/api/v1/quran';
const FETCH_TIMEOUT = 8000; // 8 seconds

// const API_BASE = 'https://ayasofya.santralsoftware.com/api/v1/quran';
// const API_KEY = 'BEqnMI9HJ2IXwNVxljJOuNyvU0s28oEE';

/* ── Fetching Logic ── */

async function fetchAndSaveSurahs(lang = 'turkish') {
  const url = `${API_BASE}/surahs?language=${lang}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const json = await res.json();
    const list = json.surahs || json;

    if (!Array.isArray(list)) return null;

    const db = await getDB();
    for (const s of list) {
      await db.runAsync(
        `INSERT OR REPLACE INTO surahs (id, language, name, aya_count) VALUES (?, ?, ?, ?)`,
        [s.id, lang, s.name, s.aya_count || s.ayahCount]
      );
    }
    return list;
  } catch (e) {
    console.warn("fetchAndSaveSurahs failed:", e);
    return null;
  }
}

/** 
 * Fetches ayas for a specific surah and language.
 * Uses the /surahs/:id/ayas endpoint with optional author_code for tafsir.
 */
async function fetchAndSaveAyas(surahId, lang = 'turkish', authorCode = '') {
  let url = `${API_BASE}/surahs/${surahId}/ayas?language=${lang}`;
  if (authorCode) url += `&author_code=${encodeURIComponent(authorCode)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const json = await res.json();

    // Structure depends on your backend return.
    const ayas = json.ayas || json;

    if (!Array.isArray(ayas)) return null;

    const db = await getDB();
    for (const a of ayas) {
      await db.runAsync(
        `INSERT OR REPLACE INTO ayas (id, surah_id, aya_number, juz_number, page_number, text) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [a.id, surahId, a.aya_number, a.juz_number, a.page_number, a.text]
      );

      // If tafsirs are included
      if (a.tafsirs && Array.isArray(a.tafsirs)) {
        for (const t of a.tafsirs) {
          await db.runAsync(
            `INSERT OR REPLACE INTO tafsirs (id, aya_id, author, language, text) 
             VALUES (?, ?, ?, ?, ?)`,
            [t.id, a.id, t.author, lang, t.text]
          );
        }
      }
    }
    return ayas;
  } catch (e) {
    console.warn(`fetchAndSaveAyas(${surahId}) failed:`, e);
    return null;
  }
}

/* ── Public API ── */

/**
 * Get all surahs for the list view.
 */
export async function getSurahs(lang = 'turkish') {
  let db;
  try {
    db = await getDB();
  } catch (e) {
    return FALLBACK_SURAHS;
  }

  // 1️⃣ Cache check (SQLite)
  try {
    const rows = await db.getAllAsync(`SELECT * FROM surahs WHERE language = ? ORDER BY id ASC`, [lang]);
    if (rows && rows.length > 0) {
      // Return with 'ayahCount' mapping for UI compatibility
      return rows.map(r => ({ ...r, ayahCount: r.aya_count }));
    }
  } catch (err) {
    console.warn("Surahs db read error:", err);
  }

  // 2️⃣ API fetch
  const fetched = await fetchAndSaveSurahs(lang);
  if (fetched) return fetched.map(r => ({ ...r, ayahCount: r.aya_count || r.ayahCount }));

  // 3️⃣ Local fallback
  return FALLBACK_SURAHS;
}

/**
 * Get full surah content (ayas + optional tafsir)
 */
export async function getSurahContent(surahId, lang = 'turkish', authorCode = '') {
  let db;
  try {
    db = await getDB();
  } catch (e) {
    return FALLBACK_SURAHS.find(s => s.id === surahId);
  }

  // 1️⃣ Cache check
  try {
    const ayas = await db.getAllAsync(
      `SELECT * FROM ayas WHERE surah_id = ? ORDER BY aya_number ASC`,
      [surahId]
    );
    if (ayas && ayas.length > 0) {
      // Build a unified text from ayas for the current UI
      const wholeText = ayas.map(a => a.text).join(' ');

      // Get tafsir (using first one found for language if available)
      const tafsirRow = await db.getFirstAsync(
        `SELECT text FROM tafsirs WHERE language = ? AND aya_id IN (SELECT id FROM ayas WHERE surah_id = ?) LIMIT 1`,
        [lang, surahId]
      );

      return {
        id: surahId,
        ayas: ayas,
        text: wholeText, // Legacy support for UI
        meaning: tafsirRow ? tafsirRow.text : '' // Legacy support
      };
    }
  } catch (err) {
    console.warn("Ayas db read error:", err);
  }

  // 2️⃣ API fetch
  const fetched = await fetchAndSaveAyas(surahId, lang, authorCode);
  if (fetched) {
    // Re-query to return consistent structure
    return getSurahContent(surahId, lang, authorCode);
  }

  // 3️⃣ Local fallback
  return FALLBACK_SURAHS.find(s => s.id === surahId);
}

/**
 * Get available reciters.
 */
export async function getReciters() {
  const url = `${API_BASE}/reciters`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.reciters || json || [];
  } catch (e) {
    console.warn("getReciters failed:", e);
    return [];
  }
}

/**
 * Get available tafsirs/translations for a language.
 */
export async function getTafsirs(lang = 'turkish') {
  const url = `${API_BASE}/tafsirs?language=${lang}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.tafsirs || json || [];
  } catch (e) {
    console.warn("getTafsirs failed:", e);
    return [];
  }
}

/**
 * Get available languages.
 */
export async function getLanguages() {
  const url = `${API_BASE}/languages`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.languages || json || [];
  } catch (e) {
    console.warn("getLanguages failed:", e);
    return [];
  }
}
