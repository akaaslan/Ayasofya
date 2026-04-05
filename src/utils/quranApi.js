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

const FETCH_TIMEOUT = 8000; // 8 seconds

const API_BASE = 'https://ayasofya.santralsoftware.com/api/v1/quran';
const API_KEY = 'BEqnMI9HJ2IXwNVxljJOuNyvU0s28oEE';

/* ── Fetching Logic ── */

async function fetchAndSaveSurahs(lang = 'turkish') {
  const url = `${API_BASE}/surahs?language=${lang}`;
  try {
    const res = await fetch(url, { method: "GET", headers: { 'X-API-KEY': API_KEY } });
    if (!res.ok) return null;
    const json = await res.json();
    const list = json.surahs || json;

    if (!Array.isArray(list)) return null;

    const db = await getDB();
    await db.execAsync('BEGIN TRANSACTION');
    try {
      for (const s of list) {
        await db.runAsync(
          `INSERT OR REPLACE INTO surahs (id, language, name, aya_count) VALUES (?, ?, ?, ?)`,
          [s.id, lang, s.name, s.aya_count || s.ayahCount]
        );
      }
      await db.execAsync('COMMIT');
    } catch (txErr) {
      await db.execAsync('ROLLBACK');
      throw txErr;
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
async function fetchAndSaveAyas(surahId, lang = 'turkish', authorCode = '', page = 1) {
  let url = `${API_BASE}/surahs/${surahId}/ayas?language=${lang}`;
  if (authorCode) url += `&author_code=${encodeURIComponent(authorCode)}`;
  url += `&current_page=${page}`;

  try {
    const res = await fetch(url, { method: "GET", headers: { 'X-API-KEY': API_KEY }  });
    if (!res.ok) return null;
    const json = await res.json();

    const ayas = json.ayas || json;

    if (!Array.isArray(ayas)) return null;

    const db = await getDB();
    await db.execAsync('BEGIN TRANSACTION');
    try {
      for (const a of ayas) {
        await db.runAsync(
          `INSERT OR REPLACE INTO ayas (id, surah_id, aya_number, juz_number, page_number, text, transliteration) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [a.id, surahId, a.aya_number, a.juz_number, a.page_number, a.text, a.transliteration || null]
        );

        if (a.translation) {
          await db.runAsync(
            `INSERT OR REPLACE INTO tafsirs (id, aya_id, author, language, text) 
             VALUES (?, ?, ?, ?, ?)`,
            [parseInt(a.id.toString() + '999'), a.id, authorCode || 'default_author', lang, a.translation]
          );
        }

        if (a.tafsirs && Array.isArray(a.tafsirs)) {
          for (const t of a.tafsirs) {
            await db.runAsync(
              `INSERT OR REPLACE INTO tafsirs (id, aya_id, author, language, text) 
               VALUES (?, ?, ?, ?, ?)`,
              [t.id || t.tafsir_id || (a.id + '' + t.author), a.id, t.author, lang, t.text]
            );
          }
        }
      }
      await db.execAsync('COMMIT');
    } catch (txErr) {
      await db.execAsync('ROLLBACK');
      throw txErr;
    }
    return {
      ayas,
      pagination: json.pagination || null
    };
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
export async function getSurahContent(surahId, lang = 'turkish', authorCode = '', page = 1) {
  let db;
  try {
    db = await getDB();
  } catch (e) {
    const fallback = FALLBACK_SURAHS.find(s => s.id === surahId);
    if (fallback) return { ...fallback, pagination: { has_next: false } };
    return { id: surahId, ayas: [], pagination: { has_next: false } };
  }

  const perPage = 10;
  const offset = (page - 1) * perPage;

  // 1️⃣ Always try fetching the latest remote page to update local cache
  const fetchedResult = await fetchAndSaveAyas(surahId, lang, authorCode, page);
  const paginationResult = fetchedResult ? fetchedResult.pagination : null;

  // 2️⃣ Load from local DB
  try {
    const ayas = await db.getAllAsync(
      `SELECT * FROM ayas WHERE surah_id = ? ORDER BY aya_number ASC LIMIT ? OFFSET ?`,
      [surahId, perPage, offset]
    );
    if (ayas && ayas.length > 0) {
      // Build a unified text from ayas for the current UI
      const wholeText = ayas.map(a => a.text).join(' ');

      // Get all tafsir rows for this surah
      const allTafsirs = await db.getAllAsync(
        `SELECT * FROM tafsirs WHERE language = ? AND aya_id IN (SELECT id FROM ayas WHERE surah_id = ?)`,
        [lang, surahId]
      );
      
      // Filter optionally by authorCode
      const filteredTafsirs = authorCode 
        ? allTafsirs.filter(t => t.author === authorCode) 
        : allTafsirs;

      const mappedAyas = ayas.map(aya => ({
        ...aya,
        tafsirs: filteredTafsirs.filter(t => t.aya_id === aya.id)
      }));

      return {
        id: surahId,
        ayas: mappedAyas,
        text: wholeText, // Legacy support for UI
        meaning: mappedAyas.length > 0 && mappedAyas[0].tafsirs.length > 0 ? mappedAyas[0].tafsirs[0].text : '', // Legacy support
        pagination: paginationResult || { has_next: false }
      };
    }
  } catch (err) {
    console.warn("Ayas db read error:", err);
  }

  // 3️⃣ Local fallback (only for page 1)
  if (page === 1) {
    const fallback = FALLBACK_SURAHS.find(s => s.id === surahId);
    if (fallback) {
      return { ...fallback, pagination: { has_next: false } };
    }
  }
  return { id: surahId, ayas: [], pagination: { has_next: false } };
}

/**
 * Get available reciters (cached in SQLite key_value_store).
 */
export async function getReciters() {
  // Try cache first
  try {
    const db = await getDB();
    const row = await db.getFirstAsync(`SELECT value FROM key_value_store WHERE key = 'reciters'`);
    if (row) {
      const cached = JSON.parse(row.value);
      if (cached.length > 0) {
        // Refresh in background
        fetchRecitersFromApi().catch(() => {});
        return cached;
      }
    }
  } catch {}

  return fetchRecitersFromApi();
}

async function fetchRecitersFromApi() {
  const url = `${API_BASE}/reciters`;
  try {
    const res = await fetch(url, { method: "GET", headers: { 'X-API-KEY': API_KEY }  });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json.reciters || json || [];
    // Cache
    try {
      const db = await getDB();
      await db.runAsync(
        `INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)`,
        ['reciters', JSON.stringify(list)]
      );
    } catch {}
    return list;
  } catch (e) {
    console.warn("getReciters failed:", e);
    return [];
  }
}

/**
 * Get available tafsirs/translations for a language.
 */
export async function getTafsirs(lang = 'turkish') {
  const cacheKey = `tafsirs_${lang}`;
  // Try cache first
  try {
    const db = await getDB();
    const row = await db.getFirstAsync(`SELECT value FROM key_value_store WHERE key = ?`, [cacheKey]);
    if (row) {
      const cached = JSON.parse(row.value);
      if (cached.length > 0) {
        fetchTafsirsFromApi(lang).catch(() => {});
        return cached;
      }
    }
  } catch {}

  return fetchTafsirsFromApi(lang);
}

async function fetchTafsirsFromApi(lang = 'turkish') {
  const url = `${API_BASE}/tafsirs?language=${lang}`;
  try {
    const res = await fetch(url, { method: "GET", headers: { 'X-API-KEY': API_KEY }  });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json.tafsirs || json || [];
    
    if (Array.isArray(list)) {
      // Map them into a format suitable for the UI Selection Modal
      const mappedList = list.map((t, index) => ({
        id: t.id || `tafsir_${index}`,
        author: t.author || t.name,
        name: t.name || t.author,
        author_code: t.author_code || t.author || t.name
      }));

      try {
        const db = await getDB();
        await db.runAsync(
          `INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)`,
          [`tafsirs_${lang}`, JSON.stringify(mappedList)]
        );
      } catch {}
      return mappedList;
    }
    
    return [];
  } catch (e) {
    console.warn("getTafsirs API failed:", e);
    return [];
  }
}

/**
 * Get available languages.
 */
export async function getLanguages() {
  const url = `${API_BASE}/languages`;
  try {
    const res = await fetch(url, { method: "GET", headers: { 'X-API-KEY': API_KEY }  });
    if (!res.ok) return [];
    const json = await res.json();
    return json.languages || json || [];
  } catch (e) {
    console.warn("getLanguages failed:", e);
    return [];
  }
}
