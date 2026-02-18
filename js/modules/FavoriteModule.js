/**
 * FavoriteModule - Handles saving and retrieving favorite words
 */
export class FavoriteModule {
    constructor() {
        this.favorites = this.loadFavorites();
    }

    /**
     * Add word to favorites
     */
    addFavorite(favoriteItem) {
        // Check if already exists
        const exists = this.favorites.some(f => f.word === favoriteItem.word);
        
        if (!exists) {
            this.favorites.push({
                word: favoriteItem.word,
                meaning: favoriteItem.meaning,
                timestamp: favoriteItem.timestamp || Date.now()
            });
            
            this.saveFavorites();
            return true;
        }
        
        return false;
    }

    /**
     * Remove word from favorites
     */
    removeFavorite(word) {
        const index = this.favorites.findIndex(f => f.word === word);
        
        if (index !== -1) {
            this.favorites.splice(index, 1);
            this.saveFavorites();
            return true;
        }
        
        return false;
    }

    /**
     * Check if word is in favorites
     */
    isFavorite(word) {
        return this.favorites.some(f => f.word === word);
    }

    /**
     * Get all favorites
     */
    getAllFavorites() {
        return this.favorites.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Clear all favorites
     */
    clearFavorites() {
        this.favorites = [];
        this.saveFavorites();
    }

    /**
     * Save favorites to localStorage
     */
    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        
        // Also sync to cloud if user is logged in (future enhancement)
        this.syncToCloud();
    }

    /**
     * Load favorites from localStorage
     */
    loadFavorites() {
        const stored = localStorage.getItem('favorites');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.error('Error loading favorites:', error);
                return [];
            }
        }
        return [];
    }

    /**
     * Sync favorites to cloud (placeholder for future implementation)
     */
    async syncToCloud() {
        // This would sync to a backend service
        // For now, it's a placeholder
        console.log('Cloud sync placeholder');
    }

    /**
     * Export favorites as JSON
     */
    exportFavorites() {
        const dataStr = JSON.stringify(this.favorites, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `risale-nur-favorites-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    /**
     * Import favorites from JSON
     */
    async importFavorites(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (Array.isArray(imported)) {
                        this.favorites = imported;
                        this.saveFavorites();
                        resolve(imported.length);
                    } else {
                        reject('Invalid format');
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}
