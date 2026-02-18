/* ===== DictionaryModule — Word Lookup & Normalization ===== */

const DictionaryModule = (() => {
  let dictionary = [];
  let loaded = false;

  /**
   * Load dictionary data from JSON file
   */
  async function load() {
    if (loaded) return;
    try {
      const res = await fetch('data/dictionary.json');
      dictionary = await res.json();
      loaded = true;
      console.log(`[DictionaryModule] Loaded ${dictionary.length} words.`);
    } catch (e) {
      console.error('[DictionaryModule] Failed to load dictionary:', e);
      dictionary = [];
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
    const exact = dictionary.find(e => normalize(e.word) === normalized);
    if (exact) return { found: true, entry: exact };

    // Partial / fuzzy match — find words that start with the query or contain it
    const suggestions = dictionary
      .filter(e => {
        const w = normalize(e.word);
        return w.includes(normalized) || normalized.includes(w) || levenshtein(w, normalized) <= 2;
      })
      .slice(0, 5);

    return { found: false, suggestions };
  }

  /**
   * Search dictionary (returns list of matching entries)
   */
  function search(query) {
    const q = normalize(query);
    if (!q) return [];
    return dictionary.filter(e => {
      const w = normalize(e.word);
      const m = e.meaning.toLowerCase();
      return w.includes(q) || q.includes(w) || m.includes(q);
    }).slice(0, 20);
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
