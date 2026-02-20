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
   *
   * Handles all OCR artefacts:
   *  • Kıvrımlı çift tırnaklar "..." (U+201C/D) → kaldırılır  ← BUG FIX
   *  • Kıvrımlı tek tırnaklar '...' (U+2018/9) → düz ' → kaldırılır
   *  • Osmanlıca transliterasyon: â,î,û,ê,ô → base vowel
   *  • NFKD: ş→s, ç→c, ğ→g, combining diacritics → stripped
   *  • Tüm noktalama ve tire türleri → kaldırılır
   */
  function normalize(word) {
    if (!word) return '';
    return word
      .toLowerCase()
      // ── Tüm kıvrımlı/akıllı tek tırnak → düz apostrof U+0027 ────────────
      // ' U+2018  ' U+2019  ‚ U+201A  ‛ U+201B  ʼ U+02BC  ʻ U+02B9  ` U+0060  ´ U+00B4
      .replace(/[\u2018\u2019\u201A\u201B\u02BC\u02B9\u0060\u00B4]/g, "'")
      // ── Tüm kıvrımlı çift tırnak → kaldır (OCR artefaktı: "Mânevi" → Mânevi) ──
      // " U+201C  " U+201D  „ U+201E  ‟ U+201F  « U+00AB  » U+00BB
      .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '')
      // ── Osmanlıca/Arapça Latin transliterasyon ünlüleri ──────────────────
      .replace(/[\u00E2\u00E1\u00E0\u00E4\u0101]/g, 'a')  // â á à ä ā
      .replace(/[\u00EA\u00E9\u00E8\u00EB\u0113]/g, 'e')  // ê é è ë ē
      .replace(/[\u00EE\u00ED\u00EC\u00EF\u012B]/g, 'i')  // î í ì ï ī
      .replace(/[\u00FB\u00FA\u00F9\u00FC\u016B]/g, 'u')  // û ú ù ü ū
      .replace(/[\u00F4\u00F3\u00F2\u00F6\u014D]/g, 'o')  // ô ó ò ö ō
      .replace(/\u0131/g, 'i')                             // ı → i
      // ── NFKD: ş→s, ç→c, ğ→g + tüm birleşik diyakritikleri kaldır ───────
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      // ── Kalan tüm noktalama, tire ve ayraçları kaldır ────────────────────
      // Dahil: . , ; : ! ? " ' ( ) [ ] { } < > … - – — ‒ ‑
      .replace(/[.,;:!?"'()\[\]{}<>\u2026\u2013\u2014\u2015\u2010\u2011\u002D]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  // ── Turkish suffix stripping ──────────────────────────────
  // Ordered from longest to shortest so we peel the biggest suffix first.
  const TR_SUFFIXES = [
    // plural + case combos
    'larin','lerin','larun','lerun',
    'lara','lere','lari','leri',
    'lar','ler',
    // possessive
    'nin','nun','nün','nın',
    // case
    'dan','den','tan','ten',
    'da','de','ta','te',
    'in','un','ün','ın',
    'na','ne','ya','ye',
    // accusative / dative
    'ı','i','u','ü',
  ];

  /**
   * Strip Turkish inflectional suffixes from a normalized word.
   * Returns an array of candidate stems (longest-first strip).
   */
  function _turkishStems(normalized) {
    const stems = [];
    let cur = normalized;
    // Try stripping up to 2 suffix layers
    for (let round = 0; round < 2; round++) {
      let stripped = false;
      for (const sfx of TR_SUFFIXES) {
        if (cur.length > sfx.length + 1 && cur.endsWith(sfx)) {
          cur = cur.slice(0, -sfx.length);
          stems.push(cur);
          stripped = true;
          break;
        }
      }
      if (!stripped) break;
    }
    return stems;
  }

  // ── OCR confusion map ─────────────────────────────────────
  // GPT/Tesseract frequently confuse these Turkish-specific characters.
  const OCR_CONFUSION = [
    ['s', 'ş'], ['c', 'ç'], ['g', 'ğ'],
    ['o', 'ö'], ['u', 'ü'], ['i', 'ı'],
  ];

  /**
   * Generate OCR-confusion variants of a word.
   * E.g. "esraf" → ["eşraf", "esraf", …] (swap one char at a time)
   */
  function _ocrVariants(normalized) {
    const variants = [];
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      for (const [a, b] of OCR_CONFUSION) {
        let replacement = null;
        if (ch === a) replacement = b;
        else if (ch === b) replacement = a;
        if (replacement) {
          const v = normalized.slice(0, i) + replacement + normalized.slice(i + 1);
          variants.push(v);
        }
      }
    }
    return variants;
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
    // Minimum length for the "query includes dict-entry" direction:
    // prevents trivially short entries ("va", "vaz") from dominating
    // when the query is a long derived word (e.g. "vazifedarane").
    const minMatchLen = normalized.length > 5
      ? Math.max(3, Math.floor(normalized.length * 0.4))
      : 1;
    const byContains = [];

    for (const item of normalizedEntries) {
      const w = item.nw || item.ns;
      if (!w) continue;
      if (first && w[0] !== first) continue;
      if (w.includes(normalized) || (normalized.includes(w) && w.length >= minMatchLen)) {
        byContains.push(item.entry);
        if (byContains.length >= 20) break; // collect more, trim later
      }
    }

    // Prefer longer matches (closer to query length) over short ones
    byContains.sort((a, b) => {
      const wa = normalize(a.word || '').length;
      const wb = normalize(b.word || '').length;
      return wb - wa;
    });

    let suggestions = byContains.slice(0, 8);

    if (suggestions.length < 5) {
      const fuzzy = [];
      let scanned = 0;
      for (const item of normalizedEntries) {
        const w = item.nw || item.ns;
        if (!w) continue;
        if (first && w[0] !== first) continue;
        // Uzun kelimelerde (≥7 harf) 2 harf farkına izin ver → daha iyi öneri
        const _maxLev = normalized.length >= 7 ? 2 : 1;
        if (Math.abs(w.length - normalized.length) > _maxLev + 1) continue;

        scanned++;
        if (levenshtein(w, normalized) <= _maxLev) {
          fuzzy.push(item.entry);
          if (fuzzy.length >= 5) break;
        }
        if (scanned >= 800) break;
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
   * Smart lookup: chains exact → Turkish stems → OCR confusion → stems+OCR.
   * Returns same shape as lookup().
   */
  function smartLookup(rawWord) {
    // ── Ön temizleme: OCR'ın başa/sona eklediği tırnak ve noktalama ──────────
    // "Mânevi" → Mânevi   |   'kelime' → kelime   |   ...söz... → söz
    const preCleaned = rawWord
      .replace(/^[\s\u201C\u201D\u201E\u2018\u2019\u00AB\u00BB"'.,;:!?()\[\]{}<>\u2026\u2013\u2014\u002D]+/, '')
      .replace(/[\s\u201C\u201D\u201E\u2018\u2019\u00AB\u00BB"'.,;:!?()\[\]{}<>\u2026\u2013\u2014\u002D]+$/, '');
    const word = preCleaned.length >= 1 ? preCleaned : rawWord;

    // 1) Normal lookup (exact + fuzzy)
    const direct = lookup(word);
    if (direct.found) return direct;

    const normalized = normalize(word);
    if (!normalized || normalized.length < 2) return direct;

    // 1.5) Ayraç bölme — tek tırnak veya tire öncesi tabanı ara ─────────────
    // hakîkat'ten → hakîkat  |  feyz'in → feyz  |  rıza-yı → rıza  |  şefkat—i → şefkat
    // Not: şu'arâ ayraç idx=2 < 3 → atlanır; tam normalize ile zaten bulunur
    const _sepIdx = word.search(/[\u0027\u2018\u2019\u02BC\u002D\u2013\u2014]/);
    if (_sepIdx >= 3) {
      const _base = word.slice(0, _sepIdx);
      const _baseResult = lookup(_base);
      if (_baseResult.found) return _baseResult;
      // Taban üzerinde Türkçe ek soyma
      const _baseNorm = normalize(_base);
      for (const _stem of _turkishStems(_baseNorm)) {
        const _arr = exactIndex.get(_stem);
        if (_arr && _arr.length > 0) return { found: true, entry: _arr[0], entries: _arr };
      }
    }

    // 2) Turkish suffix-stripped stems
    const stems = _turkishStems(normalized);
    for (const stem of stems) {
      const arr = exactIndex.get(stem);
      if (arr && arr.length > 0) {
        return { found: true, entry: arr[0], entries: arr };
      }
    }

    // 2.5) Progressive prefix match — longest dict entry that is a prefix of the query.
    //       Handles Arabic/Persian derivational suffixes:
    //       vazifedarane → vazifedar, mütefekkir → mütefek…, medarı → medar, etc.
    //       Requires the prefix to cover at least 40% of the query length.
    if (normalized.length >= 5) {
      const minPrefixLen = Math.max(3, Math.floor(normalized.length * 0.4));
      let bestPrefixEntry = null;
      let bestPrefixLen   = 0;
      for (const item of normalizedEntries) {
        const w = item.nw || item.ns;
        if (!w || w.length < minPrefixLen || w.length <= bestPrefixLen) continue;
        if (w[0] !== normalized[0]) continue; // first-char short-circuit
        if (normalized.startsWith(w)) {
          bestPrefixLen   = w.length;
          bestPrefixEntry = item.entry;
        }
      }
      if (bestPrefixEntry) {
        const key = normalize(bestPrefixEntry.word || '');
        const allE = exactIndex.get(key) || [bestPrefixEntry];
        return { found: true, entry: bestPrefixEntry, entries: allE };
      }
    }

    // 3) OCR confusion on the full word
    for (const variant of _ocrVariants(normalized)) {
      const arr = exactIndex.get(variant);
      if (arr && arr.length > 0) {
        return { found: true, entry: arr[0], entries: arr };
      }
    }

    // 4) OCR confusion on each stem
    for (const stem of stems) {
      for (const variant of _ocrVariants(stem)) {
        const arr = exactIndex.get(variant);
        if (arr && arr.length > 0) {
          return { found: true, entry: arr[0], entries: arr };
        }
      }
    }

    // 5) OCR confusion + stems on first-char-swapped variants
    //    Handles cases where first char is wrong (e.g. "ş" read as "s")
    for (const variant of _ocrVariants(normalized)) {
      const vStems = _turkishStems(variant);
      for (const vs of vStems) {
        const arr = exactIndex.get(vs);
        if (arr && arr.length > 0) {
          return { found: true, entry: arr[0], entries: arr };
        }
      }
    }

    return direct; // return original with suggestions
  }

  /**
   * Search dictionary (returns list of matching entries)
   */
  function search(query) {
    const q = normalize(query);
    if (!q) return [];

    const out = [];
    const seen = new Set();

    const pushUnique = (e) => {
      if (!e) return;
      const k = `${e.word}|${e.meaning}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push(e);
    };

    // 1) Exact word/stem matches always first
    const exact = exactIndex.get(q) || [];
    for (const e of exact) pushUnique(e);

    // 2) Then prefix / contains / meaning matches (ranked)
    const prefix = [];
    const contains = [];
    const inMeaning = [];

    for (const e of dictionary) {
      const w = normalize(e.word);
      const s = normalize(e.stem || '');

      // already added from exactIndex
      if ((w && w === q) || (s && s === q)) continue;

      if ((w && w.startsWith(q)) || (s && s.startsWith(q))) {
        prefix.push(e);
        continue;
      }

      if ((w && w.includes(q)) || (s && s.includes(q))) {
        contains.push(e);
        continue;
      }

      const m = normalize(String(e.meaning || ''));
      if (m && m.includes(q)) inMeaning.push(e);
    }

    for (const e of prefix) pushUnique(e);
    for (const e of contains) pushUnique(e);
    for (const e of inMeaning) pushUnique(e);

    // Keep payload bounded for UI performance
    if (out.length > 200) out.length = 200;

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

  return { load, lookup, smartLookup, search, normalize, getAll };
})();
