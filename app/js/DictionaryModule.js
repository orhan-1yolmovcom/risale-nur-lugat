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

      // Store arrays so words with multiple meanings are all kept
      if (nw) {
        if (!exactIndex.has(nw)) exactIndex.set(nw, [entry]);
        else exactIndex.get(nw).push(entry);
      }
      if (ns && ns !== nw) {
        if (!exactIndex.has(ns)) exactIndex.set(ns, [entry]);
        else exactIndex.get(ns).push(entry);
      }

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

  /**
   * Parse the entire SQL dump by streaming through the text character-by-character.
   * This handles:
   *   • 133+ separate INSERT blocks in phpMyAdmin dumps
   *   • Semicolons inside quoted strings (no premature truncation)
   *   • Escaped quotes '' inside values
   *   • Multi-line anlam fields with newlines
   */
  function _parseDbLugatSql(sqlText) {
    const entries = [];
    const len = sqlText.length;

    // We walk through the entire text looking for tuple boundaries: ( ... )
    // We only parse tuples that appear after a VALUES keyword.
    let inValues = false;  // are we inside a VALUES section?
    let inQuote  = false;  // inside a SQL single-quoted string?
    let depth    = 0;      // parenthesis nesting depth
    let cur      = '';     // current tuple content accumulator

    for (let i = 0; i < len; i++) {
      const ch = sqlText[i];

      // ── Handle single-quote toggling ──────────────────
      if (ch === "'") {
        // Escaped quote '' inside a string
        if (inQuote && i + 1 < len && sqlText[i + 1] === "'") {
          if (depth > 0) cur += "''";
          i++;
          continue;
        }
        inQuote = !inQuote;
        if (depth > 0) cur += ch;
        continue;
      }

      // ── Outside a quoted string ───────────────────────
      if (!inQuote) {
        // Detect VALUES keyword (case-insensitive)
        if ((ch === 'V' || ch === 'v') && sqlText.substring(i, i + 6).toUpperCase() === 'VALUES') {
          inValues = true;
          i += 5; // skip past 'ALUES'
          continue;
        }

        // Detect INSERT keyword → means previous VALUES block ended, new one starts
        if ((ch === 'I' || ch === 'i') && sqlText.substring(i, i + 6).toUpperCase() === 'INSERT') {
          inValues = false;
          depth = 0;
          cur = '';
          i += 5; // skip past 'NSERT'
          continue;
        }

        if (inValues) {
          if (ch === '(') {
            depth++;
            if (depth === 1) { cur = ''; continue; }
          } else if (ch === ')') {
            depth--;
            if (depth === 0) {
              // ── Parse the accumulated tuple ─────────
              const cols = _splitTupleFields(cur);
              if (cols.length >= 5) {
                const kelime = _decodeSqlValue(cols[2]);
                const kirp   = _decodeSqlValue(cols[3]);
                const anlam  = _decodeSqlValue(cols[4]);
                if (kelime && anlam) {
                  entries.push({
                    id:      _decodeSqlValue(cols[0]),
                    index:   String(_decodeSqlValue(cols[1]) || ''),
                    word:    String(kelime),
                    stem:    String(kirp || ''),
                    meaning: String(anlam),
                    source:  'db_lugat.sql',
                  });
                }
              }
              cur = '';
              continue;
            }
          }
        }
      }

      // Accumulate characters inside a tuple
      if (depth > 0) cur += ch;
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
      .replace(/[âáàä]/g, 'a')
      .replace(/[êéèë]/g, 'e')
      .replace(/[îíìï]/g, 'i')
      .replace(/[ûúùü]/g, 'u')
      .replace(/[ôóòö]/g, 'o')
      .replace(/[ı]/g, 'i')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’`´]/g, "'")
      .replace(/[.,;:!?"'()\[\]{}<>…«»–—\-]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  /**
   * Look up a word in the dictionary
   * Returns { found: true, entries: [...] } or { found: false, suggestions: [...] }
   */
  function lookup(rawWord) {
    const normalized = normalize(rawWord);
    if (!normalized) return { found: false, suggestions: [] };

    // Exact match — returns all entries for this word
    const exactArr = exactIndex.get(normalized);
    if (exactArr && exactArr.length > 0) {
      return { found: true, entry: exactArr[0], entries: exactArr };
    }

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
