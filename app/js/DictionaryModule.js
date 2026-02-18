/* ===== DictionaryModule — Word Lookup & Normalization ===== */

const DictionaryModule = (() => {
  let dictionary = [];
  let normalizedEntries = [];
  let exactIndex = new Map();
  let loaded = false;

  function _rebuildIndexes() {
    exactIndex = new Map();
    normalizedEntries = dictionary.map((entry) => {
      const nw = normalize(entry.word || '');
      const ns = normalize(entry.stem || '');

      if (nw && !exactIndex.has(nw)) exactIndex.set(nw, entry);
      if (ns && !exactIndex.has(ns)) exactIndex.set(ns, entry);

      return { entry, nw, ns };
    });
  }

  async function _fetchTextFirst(urls) {
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const text = await res.text();
        if (text && text.length > 0) {
          console.log(`[DictionaryModule] SQL source bulundu: ${url}`);
          return { url, text };
        }
      } catch (_) {
        // try next source
      }
    }
    return null;
  }

  function _splitSqlTuples(valuesChunk) {
    const tuples = [];
    let inQuote = false;
    let depth = 0;
    let cur = '';

    for (let i = 0; i < valuesChunk.length; i++) {
      const ch = valuesChunk[i];

      if (ch === "'") {
        if (inQuote && valuesChunk[i + 1] === "'") {
          // escaped quote in SQL string
          if (depth > 0) cur += "''";
          i++;
          continue;
        }
        inQuote = !inQuote;
        if (depth > 0) cur += ch;
        continue;
      }

      if (!inQuote) {
        if (ch === '(') {
          depth++;
          if (depth === 1) {
            cur = '';
            continue;
          }
        } else if (ch === ')') {
          depth--;
          if (depth === 0) {
            tuples.push(cur);
            cur = '';
            continue;
          }
        }
      }

      if (depth > 0) cur += ch;
    }

    return tuples;
  }

  function _splitTupleFields(tupleText) {
    const out = [];
    let inQuote = false;
    let cur = '';

    for (let i = 0; i < tupleText.length; i++) {
      const ch = tupleText[i];

      if (ch === "'") {
        if (inQuote && tupleText[i + 1] === "'") {
          cur += "''";
          i++;
          continue;
        }
        inQuote = !inQuote;
        cur += ch;
        continue;
      }

      if (!inQuote && ch === ',') {
        out.push(cur.trim());
        cur = '';
        continue;
      }

      cur += ch;
    }
    out.push(cur.trim());
    return out;
  }

  function _decodeSqlValue(v) {
    const t = (v || '').trim();
    if (!t || /^null$/i.test(t)) return '';

    if (t.startsWith("'") && t.endsWith("'")) {
      return t.slice(1, -1)
        .replace(/''/g, "'")
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .trim();
    }

    const n = Number(t);
    return Number.isFinite(n) ? n : t;
  }

  function _parseDbLugatSql(sqlText) {
    const entries = [];
    const insertRegex = /INSERT\s+INTO\s+`db_lugat`[\s\S]*?VALUES\s*([\s\S]*?);/gi;
    let match;

    while ((match = insertRegex.exec(sqlText))) {
      const valuesChunk = match[1] || '';
      const tuples = _splitSqlTuples(valuesChunk);

      for (const tuple of tuples) {
        const cols = _splitTupleFields(tuple);
        if (cols.length < 5) continue;

        const id      = _decodeSqlValue(cols[0]);
        const indeks  = _decodeSqlValue(cols[1]);
        const kelime  = _decodeSqlValue(cols[2]);
        const kirp    = _decodeSqlValue(cols[3]);
        const anlam   = _decodeSqlValue(cols[4]);

        if (!kelime || !anlam) continue;

        entries.push({
          id,
          index: String(indeks || ''),
          word: String(kelime),
          stem: String(kirp || ''),
          meaning: String(anlam),
          source: 'db_lugat.sql',
        });
      }
    }

    return entries;
  }

  /**
   * Load dictionary data from db_lugat.sql first, JSON fallback second.
   */
  async function load() {
    if (loaded) return;
    try {
      const sqlSource = await _fetchTextFirst([
        'data/db_lugat.sql',
        '../db_lugat.sql',
        '/db_lugat.sql',
        'db_lugat.sql',
      ]);

      if (sqlSource) {
        console.time('[DictionaryModule] SQL parse süresi');
        dictionary = _parseDbLugatSql(sqlSource.text);
        console.timeEnd('[DictionaryModule] SQL parse süresi');
        if (dictionary.length > 0) {
          _rebuildIndexes();
          loaded = true;
          console.log(`[DictionaryModule] Loaded ${dictionary.length} words from db_lugat.sql`);
          return;
        }
        console.warn('[DictionaryModule] SQL parse boş döndü, JSON fallback deneniyor.');
      } else {
        console.warn('[DictionaryModule] db_lugat.sql erişilemedi. Tam veri için dosyayı app/data/db_lugat.sql konumuna koyun.');
      }

      const res = await fetch('data/dictionary.json');
      dictionary = await res.json();
      _rebuildIndexes();
      loaded = true;
      console.log(`[DictionaryModule] Loaded ${dictionary.length} words from dictionary.json`);
    } catch (e) {
      console.error('[DictionaryModule] Failed to load dictionary:', e);
      dictionary = [];
      _rebuildIndexes();
    }
  }

  /**
   * Normalize a word for lookup: lowercase, strip punctuation, trim
   */
  function normalize(word) {
    if (!word) return '';
    return word
      .toLowerCase()
      .replace(/[.,;:!?'"()\[\]{}<>…""''«»–—\-]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  /**
   * Look up a word in the dictionary
   * Returns { found: true, entry: {...} } or { found: false, suggestions: [...] }
   */
  function lookup(rawWord) {
    const normalized = normalize(rawWord);
    if (!normalized) return { found: false, suggestions: [] };

    // Exact match
    const exact = exactIndex.get(normalized);
    if (exact) return { found: true, entry: exact };

    // Partial / fuzzy match (optimized for large datasets)
    const first = normalized[0] || '';
    const byContains = [];

    for (const item of normalizedEntries) {
      const w = item.nw || item.ns;
      if (!w) continue;
      if (first && w[0] !== first) continue;
      if (w.includes(normalized) || normalized.includes(w)) {
        byContains.push(item.entry);
        if (byContains.length >= 8) break;
      }
    }

    let suggestions = byContains;

    if (suggestions.length < 5) {
      const fuzzy = [];
      let scanned = 0;
      for (const item of normalizedEntries) {
        const w = item.nw || item.ns;
        if (!w) continue;
        if (first && w[0] !== first) continue;
        if (Math.abs(w.length - normalized.length) > 2) continue;

        scanned++;
        if (levenshtein(w, normalized) <= 1) {
          fuzzy.push(item.entry);
          if (fuzzy.length >= 5) break;
        }
        if (scanned >= 600) break;
      }
      suggestions = suggestions.concat(fuzzy);
    }

    // unique + limit
    const seen = new Set();
    suggestions = suggestions.filter((e) => {
      const k = `${e.word}|${e.meaning}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 5);

    return { found: false, suggestions };
  }

  /**
   * Search dictionary (returns list of matching entries)
   */
  function search(query) {
    const q = normalize(query);
    if (!q) return [];
    const out = [];
    for (const e of dictionary) {
      const w = normalize(e.word);
      const s = normalize(e.stem || '');
      const m = String(e.meaning || '').toLowerCase();
      if (w.includes(q) || s.includes(q) || q.includes(w) || m.includes(q)) {
        out.push(e);
        if (out.length >= 20) break;
      }
    }
    return out;
  }

  /**
   * Simple Levenshtein distance for fuzzy matching
   */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /**
   * Get all dictionary entries
   */
  function getAll() {
    return [...dictionary];
  }

  return { load, lookup, search, normalize, getAll };
})();
