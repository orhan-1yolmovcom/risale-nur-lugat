/**
 * DictionaryModule - Handles word lookup and dictionary database
 */
export class DictionaryModule {
    constructor() {
        this.dictionary = null;
        this.loadDictionary();
    }

    /**
     * Load dictionary from JSON file
     */
    async loadDictionary() {
        try {
            const response = await fetch('data/dictionary.json');
            this.dictionary = await response.json();
        } catch (error) {
            console.error('Dictionary load error:', error);
            // Fallback to embedded dictionary
            this.dictionary = this.getEmbeddedDictionary();
        }
    }

    /**
     * Embedded dictionary for fallback
     */
    getEmbeddedDictionary() {
        return {
            "mesail": {
                "word": "mesail",
                "meaning": "Mes'eleler, meseleler, sorunlar",
                "examples": ["Mesail-i diniyye: Dini meseleler"],
                "root": "mes'ele"
            },
            "hakaik": {
                "word": "hakaik",
                "meaning": "Hakikatler, gerçekler",
                "examples": ["Hakaik-i imaniye: İman hakikatleri"],
                "root": "hakikat"
            },
            "hakikat": {
                "word": "hakikat",
                "meaning": "Gerçek, doğru olan şey",
                "examples": ["Hakikat-i Kur'aniye: Kur'an'ın hakikati"],
                "root": "hakk"
            },
            "imaniye": {
                "word": "imaniye",
                "meaning": "İmana ait, imanla ilgili",
                "examples": ["Hakaik-i imaniye: İman hakikatleri"],
                "root": "iman"
            },
            "inkişaf": {
                "word": "inkişaf",
                "meaning": "Açılma, gelişme, ortaya çıkma",
                "examples": ["Hakikatlerin inkişafı"],
                "root": "keşf"
            },
            "tenvir": {
                "word": "tenvir",
                "meaning": "Aydınlatma, ışıklandırma",
                "examples": ["Kalplerin tenviri"],
                "root": "nur"
            },
            "diniyye": {
                "word": "diniyye",
                "meaning": "Dine ait, dini",
                "examples": ["Mesail-i diniyye: Dini meseleler"],
                "root": "din"
            },
            "teyid": {
                "word": "teyid",
                "meaning": "Doğrulama, destekleme, güçlendirme",
                "examples": ["İmanı teyid etmek"],
                "root": "eyy"
            },
            "küllî": {
                "word": "küllî",
                "meaning": "Genel, bütüne ait, külli",
                "examples": ["Küllî kaideler: Genel kurallar"],
                "root": "kül"
            },
            "kaideler": {
                "word": "kaideler",
                "meaning": "Kurallar, prensipler",
                "examples": ["Küllî kaideler"],
                "root": "kaide"
            },
            "cüz'î": {
                "word": "cüz'î",
                "meaning": "Küçük, parça, cüzi",
                "examples": ["Cüz'î meseleler"],
                "root": "cüz"
            },
            "tatbik": {
                "word": "tatbik",
                "meaning": "Uygulama, uyarlama",
                "examples": ["Kuralları tatbik etmek"],
                "root": "tabk"
            },
            "nur": {
                "word": "nur",
                "meaning": "Işık, aydınlık",
                "examples": ["Nur gibi parlak"],
                "root": "nur"
            },
            "kur'aniye": {
                "word": "kur'aniye",
                "meaning": "Kur'an'a ait",
                "examples": ["Hakikat-i Kur'aniye"],
                "root": "Kur'an"
            }
        };
    }

    /**
     * Normalize word for lookup
     */
    normalizeWord(word) {
        if (!word) return '';
        
        // Convert to lowercase
        word = word.toLowerCase();
        
        // Remove punctuation
        word = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        
        // Remove extra whitespace
        word = word.trim();
        
        // Note: We keep Turkish characters intact for better dictionary matching
        // Normalization of Turkish characters is not needed for this use case
        
        return word;
    }

    /**
     * Look up word in dictionary
     */
    async lookupWord(word) {
        if (!this.dictionary) {
            await this.loadDictionary();
        }

        const normalizedWord = this.normalizeWord(word);
        
        // Direct lookup
        if (this.dictionary[normalizedWord]) {
            return this.dictionary[normalizedWord];
        }

        // Try without diacritics or suffixes
        const baseWord = this.findBaseWord(normalizedWord);
        if (baseWord && this.dictionary[baseWord]) {
            return this.dictionary[baseWord];
        }

        // Not found
        return null;
    }

    /**
     * Find base word by removing common suffixes
     */
    findBaseWord(word) {
        // Common Turkish/Ottoman suffixes
        const suffixes = ['ler', 'lar', 'i', 'ı', 'e', 'a', 'in', 'ın', 'un', 'ün'];
        
        for (const suffix of suffixes) {
            if (word.endsWith(suffix)) {
                const base = word.substring(0, word.length - suffix.length);
                if (this.dictionary[base]) {
                    return base;
                }
            }
        }
        
        return null;
    }

    /**
     * Search for similar words
     */
    findSimilarWords(word, maxResults = 5) {
        if (!this.dictionary) {
            return [];
        }

        const normalizedWord = this.normalizeWord(word);
        const results = [];

        for (const [key, value] of Object.entries(this.dictionary)) {
            if (key.includes(normalizedWord) || normalizedWord.includes(key)) {
                results.push(value);
                if (results.length >= maxResults) {
                    break;
                }
            }
        }

        return results;
    }
}
