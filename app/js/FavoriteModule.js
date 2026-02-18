/* ===== FavoriteModule — Favorite Words Management ===== */

const FavoriteModule = (() => {
  const STORAGE_KEY = 'rnl_favorites';

  /**
   * Get all favorites from localStorage
   */
  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /**
   * Save favorites array to localStorage
   */
  function _save(favorites) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }

  /**
   * Add a word entry to favorites
   * @param {object} entry - { word, meaning, examples, root }
   */
  function add(entry) {
    if (!entry || !entry.word) return false;
    const favorites = getAll();
    // Check duplicates
    if (favorites.some(f => f.word.toLowerCase() === entry.word.toLowerCase())) {
      return false; // Already exists
    }
    favorites.unshift({
      ...entry,
      addedAt: new Date().toISOString(),
    });
    _save(favorites);
    return true;
  }

  /**
   * Remove a word from favorites
   */
  function remove(word) {
    let favorites = getAll();
    favorites = favorites.filter(f => f.word.toLowerCase() !== word.toLowerCase());
    _save(favorites);
  }

  /**
   * Check if a word is in favorites
   */
  function isFavorite(word) {
    return getAll().some(f => f.word.toLowerCase() === word.toLowerCase());
  }

  /**
   * Toggle favorite state
   */
  function toggle(entry) {
    if (isFavorite(entry.word)) {
      remove(entry.word);
      return false;
    } else {
      add(entry);
      return true;
    }
  }

  /**
   * Clear all favorites
   */
  function clear() {
    _save([]);
  }

  /**
   * Get count
   */
  function count() {
    return getAll().length;
  }

  return { getAll, add, remove, isFavorite, toggle, clear, count };
})();
