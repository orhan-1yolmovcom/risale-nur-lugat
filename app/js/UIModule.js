/* ===== UIModule — Page Rendering & UI Components ===== */

const UIModule = (() => {
  const appRoot = () => document.getElementById('app');

  // ============================================================
  //  SETTINGS helpers
  // ============================================================
  const SETTINGS_KEY = 'rnl_settings';
  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { fontSize: 18, theme: 'dark', arabicClarity: false, offlineDictionary: false };
    } catch { return { fontSize: 18, theme: 'dark', arabicClarity: false, offlineDictionary: false }; }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  // ============================================================
  //  SCAN HISTORY
  // ============================================================
  const HISTORY_KEY = 'rnl_scan_history';
  function getScanHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }
  function addScanHistory(entry) {
    const h = getScanHistory();
    h.unshift({ ...entry, date: new Date().toISOString() });
    if (h.length > 50) h.length = 50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }

  // ============================================================
  //  TOAST
  // ============================================================
  function showToast(message, icon = 'check_circle') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastText = document.getElementById('toast-text');
    if (!toast) return;
    toastIcon.textContent = icon;
    toastText.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    setTimeout(() => { toast.classList.add('hidden'); toast.classList.remove('flex'); }, 2500);
  }

  // ============================================================
  //  WORD MODAL
  // ============================================================
  function showWordModal(entry, allEntries) {
    const overlay = document.getElementById('word-modal-overlay');
    const modal = document.getElementById('word-modal');
    const content = document.getElementById('word-modal-content');
    if (!overlay || !modal || !content) return;

    const isFav = FavoriteModule.isFavorite(entry.word);
    const root = entry.root || entry.stem || '';
    const entries = allEntries && allEntries.length > 1 ? allEntries : null;

    content.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold text-white">${entry.word}</h2>
          ${root ? `<span class="text-xs text-white/40 mt-1 block">Kök: ${root}</span>` : ''}
        </div>
        <div class="flex items-center gap-2">
          <button id="modal-tts-btn" class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors" title="Seslendir">
            <span class="material-symbols-outlined text-white/70 text-xl">volume_up</span>
          </button>
          <button id="modal-fav-btn" class="w-10 h-10 rounded-full ${isFav ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/10'} border flex items-center justify-center hover:bg-primary/20 transition-colors" title="Favorilere Ekle">
            <span class="material-symbols-outlined ${isFav ? 'text-primary' : 'text-white/70'} text-xl">${isFav ? 'favorite' : 'favorite_border'}</span>
          </button>
        </div>
      </div>
      ${entries ? entries.map((e, idx) => `
        <div class="glass-card rounded-2xl p-4 mb-3">
          ${entries.length > 1 ? `<span class="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1 block">Anlam ${idx + 1}</span>` : ''}
          <p class="text-white/90 text-base leading-relaxed">${e.meaning}</p>
        </div>
      `).join('') : `
        <div class="glass-card rounded-2xl p-4 mb-4">
          <p class="text-white/90 text-base leading-relaxed">${entry.meaning}</p>
        </div>
      `}
      ${entry.examples && entry.examples.length > 0 ? `
        <div class="mb-4">
          <h3 class="text-xs text-white/40 uppercase tracking-widest mb-2 ml-1">Örnekler</h3>
          <div class="flex flex-wrap gap-2">
            ${entry.examples.map(ex => `<span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white/70">${ex}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <button id="modal-close-btn" class="w-full mt-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 transition-colors">
        Kapat
      </button>
    `;

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    requestAnimationFrame(() => {
      modal.style.transform = 'translateY(0)';
    });

    // Bind events
    document.getElementById('modal-close-btn')?.addEventListener('click', hideWordModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hideWordModal(); });

    document.getElementById('modal-tts-btn')?.addEventListener('click', () => {
      speakWord(entry.word);
    });

    document.getElementById('modal-fav-btn')?.addEventListener('click', () => {
      const nowFav = FavoriteModule.toggle(entry);
      const btn = document.getElementById('modal-fav-btn');
      if (btn) {
        btn.className = `w-10 h-10 rounded-full ${nowFav ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/10'} border flex items-center justify-center hover:bg-primary/20 transition-colors heart-pop`;
        btn.innerHTML = `<span class="material-symbols-outlined ${nowFav ? 'text-primary' : 'text-white/70'} text-xl">${nowFav ? 'favorite' : 'favorite_border'}</span>`;
      }
      showToast(nowFav ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı', nowFav ? 'favorite' : 'favorite_border');
    });
  }

  function hideWordModal() {
    const overlay = document.getElementById('word-modal-overlay');
    const modal = document.getElementById('word-modal');
    if (modal) modal.style.transform = 'translateY(100%)';
    setTimeout(() => {
      if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
    }, 300);
  }

  // ============================================================
  //  TTS
  // ============================================================
  function speakWord(word) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = 'tr-TR';
      utter.rate = 0.8;
      window.speechSynthesis.speak(utter);
    } else {
      showToast('Seslendirme desteklenmiyor', 'volume_off');
    }
  }

  // ============================================================
  //  BOTTOM NAV
  // ============================================================
  function bottomNav(active = 'home') {
    const items = [
      { id: 'home', icon: 'home', label: 'Ana Sayfa' },
      { id: 'search', icon: 'search', label: 'Ara' },
      { id: 'scan', icon: 'center_focus_strong', label: 'Tara' },
      { id: 'favorites', icon: 'favorite', label: 'Favoriler' },
      { id: 'settings', icon: 'settings', label: 'Ayarlar' },
    ];
    return `
      <nav class="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/5 pt-3 px-4"
           style="padding-bottom:max(env(safe-area-inset-bottom, 0px), 20px);">
        <div class="flex justify-between items-end max-w-md mx-auto">
          ${items.map(it => `
            <button data-nav="${it.id}" class="flex flex-col items-center gap-1 group min-w-[50px] transition-colors ${active === it.id ? 'text-primary' : 'text-white/40 hover:text-white/70'}">
              ${active === it.id ? '<div class="absolute -top-3 w-8 h-8 bg-primary/20 rounded-full blur-xl"></div>' : ''}
              <span class="material-symbols-outlined text-[24px] relative">${it.icon}</span>
              <span class="text-[10px] font-medium">${it.label}</span>
            </button>
          `).join('')}
        </div>
      </nav>
    `;
  }

  function bindNavEvents() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-nav');
        window.navigateTo(page);
      });
    });
  }

  // ============================================================
  //  PAGE: LOGIN
  // ============================================================
  function renderLogin() {
    appRoot().innerHTML = `
      <div class="page relative flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 calligraphy-bg">
        <!-- Decorative glows -->
        <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]"></div>
          <div class="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]"></div>
        </div>
        <div class="relative z-10 w-full max-w-[400px] flex flex-col gap-6">
          <!-- Header -->
          <div class="text-center space-y-2 mb-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary-dark shadow-lg border border-white/10 mb-4">
              <span class="material-symbols-outlined text-white text-3xl">auto_stories</span>
            </div>
            <h1 class="text-white tracking-tight text-[32px] font-bold leading-tight">Risale-i Nur Lûgat</h1>
            <p class="text-white/60 text-base font-normal leading-normal">Okuma ve Lügat</p>
          </div>
          <!-- Login Card -->
          <div class="glass-panel rounded-3xl p-6 sm:p-8 w-full shadow-lg ring-1 ring-white/5">
            <form id="login-form" class="flex flex-col gap-5" onsubmit="return false;">
              <div class="space-y-2">
                <label class="text-white/80 text-sm font-medium ml-1" for="login-email">E-posta Adresi</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span class="material-symbols-outlined text-white/40 text-xl">mail</span>
                  </div>
                  <input class="input-glass w-full rounded-2xl h-14 pl-12 pr-4 text-white placeholder:text-white/30 text-base" id="login-email" placeholder="isim@ornek.com" type="email" />
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-white/80 text-sm font-medium ml-1" for="login-password">Şifre</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span class="material-symbols-outlined text-white/40 text-xl">lock</span>
                  </div>
                  <input class="input-glass w-full rounded-2xl h-14 pl-12 pr-12 text-white placeholder:text-white/30 text-base" id="login-password" placeholder="******" type="password" />
                  <button type="button" id="toggle-pw-btn" class="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-white/40 hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-xl">visibility_off</span>
                  </button>
                </div>
              </div>
              <div id="login-error" class="text-red-400 text-sm hidden"></div>
              <button id="login-submit-btn" class="btn-liquid w-full h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg tracking-wide mt-2" type="submit">
                Giriş Yap
              </button>
            </form>
          </div>
          <!-- Guest & Sign Up -->
          <div class="flex flex-col items-center gap-6 mt-2">
            <button id="guest-btn" class="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-300 backdrop-blur-sm" type="button">
              <span class="text-white/90 text-sm font-medium">Misafir Olarak Devam Et</span>
              <span class="material-symbols-outlined text-white/60 text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            <div class="w-full flex items-center gap-4 px-8 opacity-40">
              <div class="h-px bg-gradient-to-r from-transparent via-white to-transparent flex-1"></div>
            </div>
            <div class="text-center">
              <p class="text-white/50 text-sm">Hesabın yok mu?
                <a class="text-white font-semibold hover:text-primary transition-colors ml-1 underline decoration-white/20 underline-offset-4 decoration-1 cursor-pointer" id="register-link">Kayıt Ol</a>
              </p>
            </div>
          </div>
        </div>
        <div class="absolute bottom-6 text-white/20 text-xs font-light">Sürüm 1.0.1</div>
      </div>
    `;
    bindLoginEvents();
  }

  function bindLoginEvents() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    const togglePw = document.getElementById('toggle-pw-btn');
    const pwInput = document.getElementById('login-password');
    const guestBtn = document.getElementById('guest-btn');

    togglePw?.addEventListener('click', () => {
      const type = pwInput.type === 'password' ? 'text' : 'password';
      pwInput.type = type;
      togglePw.querySelector('span').textContent = type === 'password' ? 'visibility_off' : 'visibility';
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const btn = document.getElementById('login-submit-btn');
      btn.innerHTML = '<div class="spinner"></div>';
      btn.disabled = true;
      try {
        await UserModule.login(email, password);
        window.navigateTo('home');
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
        btn.innerHTML = 'Giriş Yap';
        btn.disabled = false;
      }
    });

    guestBtn?.addEventListener('click', () => {
      UserModule.guestLogin();
      window.navigateTo('home');
    });

    document.getElementById('register-link')?.addEventListener('click', () => {
      showToast('Kayıt sistemi yakında aktif olacak', 'info');
    });
  }

  // ============================================================
  //  PAGE: HOME DASHBOARD
  // ============================================================
  function renderHome() {
    const session = UserModule.getSession();
    const greeting = session?.displayName ? `Merhaba, ${session.displayName}` : 'Merhaba';

    appRoot().innerHTML = `
      <div class="page relative flex flex-col h-full w-full max-w-md mx-auto min-h-screen liquid-gradient-bg">
        <!-- Ambient BG -->
        <div class="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>
        <div class="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[80px] opacity-30 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col h-full w-full">
          <!-- Header -->
          <header class="flex items-center justify-between px-6 pt-12 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/10">
                <span class="material-symbols-outlined text-white text-[20px]">auto_stories</span>
              </div>
              <div>
                <h1 class="text-white text-lg font-bold tracking-tight leading-none">Risale-i Nur</h1>
                <span class="text-white/50 text-xs font-medium tracking-widest uppercase">Lûgat</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button id="home-profile-btn" class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-white/70" title="${greeting}">
                <span class="material-symbols-outlined">person</span>
              </button>
            </div>
          </header>

          <!-- Greeting -->
          <div class="px-6 pt-2 pb-4">
            <p class="text-white/50 text-sm">${greeting}</p>
          </div>

          <!-- Main Action Area -->
          <main class="flex-1 flex flex-col items-center justify-center w-full px-6 relative">
            <div class="ambient-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <div class="relative flex flex-col items-center gap-6 z-10">
              <button id="home-scan-btn" class="group glass-button-primary w-48 h-48 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none"></div>
                <div class="w-20 h-20 rounded-2xl bg-black/20 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
                  <span class="material-symbols-outlined text-white text-[40px] group-hover:scale-110 transition-transform duration-300">center_focus_strong</span>
                </div>
                <div class="text-center">
                  <span class="block text-white font-bold text-lg tracking-wide drop-shadow-md">Metni Tara</span>
                  <span class="block text-white/70 text-xs font-medium mt-1">Kamera ile Oku</span>
                </div>
              </button>
              <p class="text-white/40 text-sm text-center max-w-[220px] leading-relaxed">
                Risale-i Nur metinlerini tarayın ve anlamlarını anında keşfedin.
              </p>
            </div>
          </main>

          <!-- Grid Navigation -->
          <div class="px-6 pb-28 w-full">
            <div class="grid grid-cols-2 gap-4">
              <button data-nav="search" class="glass-card h-32 rounded-3xl p-5 flex flex-col justify-between items-start group">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary-light group-hover:bg-primary/20 group-hover:text-white transition-colors">
                  <span class="material-symbols-outlined">menu_book</span>
                </div>
                <div><span class="block text-white font-semibold text-base">Lûgat</span><span class="block text-white/40 text-xs mt-0.5">Sözlük</span></div>
              </button>
              <button data-nav="favorites" class="glass-card h-32 rounded-3xl p-5 flex flex-col justify-between items-start group">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary-light group-hover:bg-primary/20 group-hover:text-white transition-colors">
                  <span class="material-symbols-outlined">favorite</span>
                </div>
                <div><span class="block text-white font-semibold text-base">Favoriler</span><span class="block text-white/40 text-xs mt-0.5">Kaydedilenler</span></div>
              </button>
              <button data-nav="history" class="glass-card h-32 rounded-3xl p-5 flex flex-col justify-between items-start group">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary-light group-hover:bg-primary/20 group-hover:text-white transition-colors">
                  <span class="material-symbols-outlined">history</span>
                </div>
                <div><span class="block text-white font-semibold text-base">Geçmiş</span><span class="block text-white/40 text-xs mt-0.5">Son Taramalar</span></div>
              </button>
              <button data-nav="settings" class="glass-card h-32 rounded-3xl p-5 flex flex-col justify-between items-start group">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary-light group-hover:bg-primary/20 group-hover:text-white transition-colors">
                  <span class="material-symbols-outlined">settings</span>
                </div>
                <div><span class="block text-white font-semibold text-base">Ayarlar</span><span class="block text-white/40 text-xs mt-0.5">Uygulama</span></div>
              </button>
            </div>
          </div>

          ${bottomNav('home')}
        </div>
      </div>
    `;
    bindNavEvents();
    document.getElementById('home-scan-btn')?.addEventListener('click', () => window.navigateTo('scan'));
    document.getElementById('home-profile-btn')?.addEventListener('click', () => {
      if (confirm('Çıkış yapmak istiyor musunuz?')) {
        UserModule.logout();
        window.navigateTo('login');
      }
    });
  }

  // ============================================================
  //  PAGE: OCR CAMERA SCAN  — brush-based area selector helpers
  // ============================================================

  /**
   * Scans the mask canvas (physical pixel space) and returns the
   * bounding box of all painted pixels in CSS-pixel coordinates.
   * Returns null if nothing has been painted.
   */
  function _getBrushBoundingBox(maskCanvas, dpr) {
    const w    = maskCanvas.width;
    const h    = maskCanvas.height;
    const data = maskCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
    if (!found) return null;
    const pad = 14 * dpr; // padding in physical pixels
    return {
      x: Math.max(0, (minX - pad) / dpr),
      y: Math.max(0, (minY - pad) / dpr),
      w: Math.min(maskCanvas.width / dpr, (maxX - minX + pad * 2) / dpr),
      h: Math.min(maskCanvas.height / dpr, (maxY - minY + pad * 2) / dpr),
    };
  }

  // ============================================================
  //  QUICK SUGGEST — instant dictionary results after brush OCR
  // ============================================================

  // Stop-words / noise that should never headline the suggest panel
  const QS_STOP = new Set([
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','r','s','t','u','v','y','z',
    've','da','de','bu','şu','o','ki','bir','ile','ise','ne','için','mi','mu','mü','mı',
    'ol','var','yok','ben','sen','biz','siz','hem','dahi','ya',
  ]);

  function _isNoise(word) {
    if (!word) return true;
    const w = word.toLowerCase().replace(/[^a-zçğıöşü]/g, '');
    return w.length <= 2 || QS_STOP.has(w);
  }

  /**
   * Build the best list of suggestions to show.
   * Priority: meaningful wordsFound > smartLookup on tokens > remaining wordsFound
   */
  function _buildSuggestList(result) {
    const allFound = (result.wordsFound || []);
    const tokens   = (result.tokens || []);
    const bag      = new Map(); // key -> {word, meaning, root, score}

    const addScored = (e, score) => {
      const key = String(e.word || '').toUpperCase();
      if (!key) return;
      const next = {
        word: e.word,
        meaning: e.meaning || '',
        root: e.stem || e.root || '',
        score,
      };
      const prev = bag.get(key);
      if (!prev || next.score > prev.score) bag.set(key, next);
    };

    // 1) Token-based smart lookup is highest priority (earlier token = higher score)
    tokens.forEach((t, idx) => {
      if (!t || t.length < 2 || _isNoise(t)) return;
      try {
        const r = DictionaryModule.smartLookup(t);
        if (r && r.found) {
          const entries = r.entries || [r.entry];
          for (const e of entries) addScored(e, 120 - idx * 6);
        }
      } catch (_) {}
    });

    // 2) OCR wordsFound as fallback (meaningful first)
    allFound.forEach((w, idx) => {
      addScored(w, _isNoise(w.word) ? 20 - idx : 70 - idx);
    });

    return Array.from(bag.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ score, ...rest }) => rest);
  }

  function _showQuickSuggest(result) {
    const panel   = document.getElementById('quick-suggest-panel');
    const content = document.getElementById('quick-suggest-content');
    if (!panel || !content) return;

    const suggestions = _buildSuggestList(result);
    const tokens      = (result.tokens || []).slice(0, 5);

    if (suggestions.length === 0 && tokens.length === 0) {
      OCRModule.stopCamera();
      window.navigateTo('analysis');
      return;
    }

    let html = '';

    if (suggestions.length > 0) {
      const first = suggestions[0];
      html += `
        <button class="qs-word-main w-full text-left glass-card rounded-2xl p-4 mb-3 flex items-center gap-3 group active:scale-[0.98] transition-transform" data-word="${first.word}">
          <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary text-2xl">book_2</span>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-white font-bold text-lg block">${first.word}</span>
            <span class="text-white/50 text-sm leading-snug mt-0.5 block line-clamp-2">${(first.meaning || '').substring(0, 120)}</span>
          </div>
          <span class="material-symbols-outlined text-white/25 text-xl flex-shrink-0">chevron_right</span>
        </button>`;

      if (suggestions.length > 1) {
        html += `<div class="flex flex-wrap gap-2 mb-1">`;
        for (let i = 1; i < suggestions.length; i++) {
          html += `<button class="qs-word-chip px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-white/75 text-sm font-medium active:scale-95 transition-transform" data-word="${suggestions[i].word}">${suggestions[i].word}</button>`;
        }
        html += `</div>`;
      }
    } else {
      html += `
        <div class="text-center py-3">
          <span class="material-symbols-outlined text-white/20 text-3xl block mb-2">search_off</span>
          <p class="text-white/40 text-sm mb-3">Lügatte doğrudan eşleşme bulunamadı</p>
        </div>
        <div class="flex flex-wrap gap-2 justify-center mb-2">
          ${tokens.filter(t => !_isNoise(t)).map(t => `<button class="qs-token-chip px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-white/70 text-sm" data-token="${t}">${t}</button>`).join('')}
        </div>`;
    }

    content.innerHTML = html;

    // Slide panel up
    panel.style.transform = 'translateY(0)';

    // Bind word clicks → open modal
    content.querySelectorAll('.qs-word-main, .qs-word-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = btn.getAttribute('data-word');
        const r = (typeof DictionaryModule.smartLookup === 'function')
          ? DictionaryModule.smartLookup(word)
          : DictionaryModule.lookup(word);
        if (r.found) showWordModal(r.entry, r.entries);
      });
    });

    content.querySelectorAll('.qs-token-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        lookupAndShowWord(btn.getAttribute('data-token'));
      });
    });

    // "Tüm Sonuçlar" → full analysis page
    const allBtn = document.getElementById('quick-suggest-all-btn');
    if (allBtn) allBtn.onclick = () => {
      _hideQuickSuggest();
      OCRModule.stopCamera();
      window.navigateTo('analysis');
    };

    // "Kapat" → dismiss, camera continues
    const closeBtn = document.getElementById('quick-suggest-close-btn');
    if (closeBtn) closeBtn.onclick = () => {
      _hideQuickSuggest();
    };
  }

  function _hideQuickSuggest() {
    const panel = document.getElementById('quick-suggest-panel');
    if (panel) panel.style.transform = 'translateY(100%)';
  }

  /**
   * Opens the brush-selection overlay with srcCanvas as the frozen background.
   *
   * Architecture:
   *   strkC  — per-stroke scratch; drawn SOLID (alpha 1); cleared after each stroke ends
   *   maskC  — persistent mask; each finished stroke is blit'd at STROKE_ALPHA
   *   render — photo → maskC (committed) → strkC (live at STROKE_ALPHA preview)
   *
   * Key improvements over previous version:
   *   • getCoalescedEvents() → all intermediate pointer positions → zero gaps on fast swipes
   *   • brushR is a reactive let → slider updates it in real time
   *   • RAF-throttled rendering → never exceeds 60 fps, no layout thrash
   *   • isPrimary guard → ignores secondary touches so pinch-zoom won't corrupt stroke
   */
  function _showBrushView(srcCanvas) {
    const view       = document.getElementById('crop-select-view');
    const canvasEl   = document.getElementById('brush-canvas');
    const ghostEl    = document.getElementById('brush-size-ghost');
    const ghostCircle= document.getElementById('brush-size-ghost-circle');
    const ghostLabel = document.getElementById('brush-size-ghost-label');
    const confirmBtn = document.getElementById('crop-confirm-btn');
    const cancelBtn  = document.getElementById('crop-cancel-btn');
    const undoBtn    = document.getElementById('brush-undo-btn');
    const clearBtn   = document.getElementById('brush-clear-btn');
    const hintEl     = document.getElementById('brush-hint');

    hintEl.textContent = 'Parmağınızla boyayın · 2 parmakla yakınlaştır';
    confirmBtn.classList.add('opacity-40', 'pointer-events-none');
    view.classList.remove('hidden');
    view.classList.add('flex');

    requestAnimationFrame(() => {
      const dpr   = window.devicePixelRatio || 1;
      const rect  = canvasEl.getBoundingClientRect();
      const dispW = rect.width;
      const dispH = rect.height;
      const physW = Math.round(dispW * dpr);
      const physH = Math.round(dispH * dpr);

      // ── Clone canvas — wipes previous listeners ──────────────
      const fc = canvasEl.cloneNode(false);
      canvasEl.parentNode.replaceChild(fc, canvasEl);
      fc.width  = physW;
      fc.height = physH;
      fc.style.cssText = `display:block;width:${dispW}px;height:${dispH}px;touch-action:none;user-select:none;cursor:crosshair;`;

      const ctx = fc.getContext('2d');
      ctx.scale(dpr, dpr);

      // ── Letterbox source image ───────────────────────────────
      const imgAspect  = srcCanvas.width / srcCanvas.height;
      const dispAspect = dispW / dispH;
      let iW, iH, iX, iY;
      if (imgAspect > dispAspect) { iW = dispW; iH = dispW / imgAspect; }
      else                        { iH = dispH; iW = dispH * imgAspect; }
      iX = (dispW - iW) / 2;
      iY = (dispH - iH) / 2;

      // ── Canvases ─────────────────────────────────────────────
      function makeOffscreen(willReadFrequently = false) {
        const c = document.createElement('canvas');
        c.width = physW; c.height = physH;
        const cx = c.getContext('2d', willReadFrequently ? { willReadFrequently: true } : undefined);
        cx.scale(dpr, dpr);
        return { c, cx };
      }
      const { c: maskC,  cx: maskCtx  } = makeOffscreen(true);
      const { c: strkC,  cx: strkCtx  } = makeOffscreen();
      const { c: overC,  cx: overCtx  } = makeOffscreen();

      function buildMaskedOcrCanvas(cropX, cropY, cropW, cropH, scaleX, scaleY) {
        // 1) Crop original source region in source-pixel space
        const out = document.createElement('canvas');
        out.width = Math.max(4, cropW);
        out.height = Math.max(4, cropH);
        const outCtx = out.getContext('2d', { willReadFrequently: true });
        outCtx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);

        // 2) Convert brush mask to CSS-pixel space
        // IMPORTANT: maskC is stored at physical resolution (physW × physH).
        // We must use physW/physH as the source dimensions, not dispW/dispH.
        // On DPR=3 devices, using dispW/dispH would only read 1/9 of the canvas.
        const maskCss = document.createElement('canvas');
        maskCss.width = Math.max(1, Math.round(dispW));
        maskCss.height = Math.max(1, Math.round(dispH));
        const maskCssCtx = maskCss.getContext('2d');
        maskCssCtx.drawImage(maskC, 0, 0, physW, physH, 0, 0, maskCss.width, maskCss.height);

        // 3) Reproject mask from display-space to cropped source-space
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.width = out.width;
        alphaCanvas.height = out.height;
        const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
        alphaCtx.setTransform(scaleX, 0, 0, scaleY, (-iX * scaleX - cropX), (-iY * scaleY - cropY));
        alphaCtx.drawImage(maskCss, 0, 0);
        alphaCtx.setTransform(1, 0, 0, 1, 0, 0);

        // 4) Make everything outside the selected brush area pure black
        const img = outCtx.getImageData(0, 0, out.width, out.height);
        const sel = alphaCtx.getImageData(0, 0, out.width, out.height);
        const p = img.data;
        const s = sel.data;
        for (let i = 0; i < p.length; i += 4) {
          const a = s[i + 3];
          if (a < 26) {
            p[i] = 0;
            p[i + 1] = 0;
            p[i + 2] = 0;
            p[i + 3] = 255;
          }
        }
        outCtx.putImageData(img, 0, 0);

        return out;
      }

      // ── Reactive brush radius ────────────────────────────────
      let brushR = Math.max(20, Math.min(24, dispW * 0.055));
      const BRUSH_COLOR  = 'rgba(139, 92, 246, 1)'; // solid on scratch
      const STROKE_ALPHA = 0.52;                     // committed opacity

      // Wire slider
      const sizeSlider = document.getElementById('brush-size-slider');
      const sizeLabel  = document.getElementById('brush-size-label');
      let ghostTimer;

      function showBrushGhost() {
        if (!ghostEl || !ghostCircle || !ghostLabel) return;
        const d = Math.max(16, Math.round(brushR * 2));
        ghostCircle.style.width  = `${d}px`;
        ghostCircle.style.height = `${d}px`;
        ghostLabel.textContent = `${Math.round(brushR)} px`;
        ghostEl.classList.add('show');
        clearTimeout(ghostTimer);
        ghostTimer = setTimeout(() => ghostEl.classList.remove('show'), 700);
      }

      if (sizeSlider) {
        sizeSlider.value = Math.round(brushR);
        if (sizeLabel) sizeLabel.textContent = Math.round(brushR);
        sizeSlider.oninput = () => {
          brushR = parseInt(sizeSlider.value, 10);
          if (sizeLabel) sizeLabel.textContent = brushR;
          showBrushGhost();
        };
        showBrushGhost();
      }

      let undoStack  = [];
      let drawing    = false;
      let lx = 0, ly = 0;
      let rafPending = false;
      let lineY      = null;  // locks brush to a single horizontal text line
      let viewScale  = 1;
      let viewTx     = 0;
      let viewTy     = 0;
      let pinching        = false;
      let pinchJustEnded = false;  // guard: block the pointerdown right after pinch release
      let touchCount = 0;
      let pinchStartDist = 0;
      let pinchStartScale = 1;
      let pinchStartMid = { x: 0, y: 0 };
      let pinchStartTx = 0;
      let pinchStartTy = 0;

      function clampView() {
        const maxX = Math.max(0, (dispW * (viewScale - 1)) / 2);
        const maxY = Math.max(0, (dispH * (viewScale - 1)) / 2);
        viewTx = Math.max(-maxX, Math.min(maxX, viewTx));
        viewTy = Math.max(-maxY, Math.min(maxY, viewTy));
      }

      function toCanvasPoint(clientX, clientY) {
        const r = fc.getBoundingClientRect();
        const sx = clientX - r.left;
        const sy = clientY - r.top;
        return {
          x: ((sx - (dispW / 2 + viewTx)) / viewScale) + dispW / 2,
          y: ((sy - (dispH / 2 + viewTy)) / viewScale) + dispH / 2,
        };
      }

      // ── RAF-throttled render ─────────────────────────────────
      function render() {
        ctx.clearRect(0, 0, dispW, dispH);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, dispW, dispH);
        ctx.save();
        ctx.translate(dispW / 2 + viewTx, dispH / 2 + viewTy);
        ctx.scale(viewScale, viewScale);
        ctx.translate(-dispW / 2, -dispH / 2);

        ctx.drawImage(srcCanvas, iX, iY, iW, iH);

        // Outside selected brush area becomes black (visual focus mode)
        if (undoStack.length > 0 || drawing) {
          // Build overlay in a separate buffer so we never modify main ctx pixels.
          // overC = solid black everywhere EXCEPT where brush strokes are (holes).
          overCtx.globalCompositeOperation = 'source-over';
          overCtx.clearRect(0, 0, dispW, dispH);
          overCtx.fillStyle = '#000';
          overCtx.fillRect(0, 0, dispW, dispH);

          overCtx.globalCompositeOperation = 'destination-out';
          overCtx.drawImage(maskC, 0, 0, dispW, dispH);  // committed strokes
          overCtx.drawImage(strkC, 0, 0, dispW, dispH);  // in-progress stroke
          overCtx.globalCompositeOperation = 'source-over'; // always reset

          // Draw on top of the already-rendered image. Holes → image visible.
          ctx.drawImage(overC, 0, 0, dispW, dispH);
        }

        // Single-line constraint visual guide
        if (lineY !== null) {
          const band = Math.max(brushR * 2.5, 30);
          ctx.save();
          ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
          ctx.fillRect(0, lineY - band, dispW, band * 2);
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.18)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, lineY - band);
          ctx.lineTo(dispW, lineY - band);
          ctx.moveTo(0, lineY + band);
          ctx.lineTo(dispW, lineY + band);
          ctx.stroke();
          ctx.restore();
        }
        // Keep selected region as original image; no purple fill overlay.
        // (Mask is used only for cutting out non-selected area above.)
        ctx.restore();

        if (viewScale > 1.01) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(10, 10, 72, 26);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = '600 12px Inter, system-ui, sans-serif';
          ctx.fillText(`Zoom ${viewScale.toFixed(1)}x`, 20, 27);
          ctx.restore();
        }
        rafPending = false;
      }
      function scheduleRender() {
        if (!rafPending) { rafPending = true; requestAnimationFrame(render); }
      }

      // ── Dense brush segment ──────────────────────────────────
      // Step = 22% of radius → absolutely no visible gaps at any swipe speed
      function brushSegment(pctx, ax, ay, bx, by) {
        const dist     = Math.hypot(bx - ax, by - ay);
        const stepSize = Math.max(0.5, brushR * 0.22);
        const steps    = Math.max(1, Math.ceil(dist / stepSize));
        pctx.strokeStyle = BRUSH_COLOR;
        pctx.lineWidth   = brushR * 2;
        pctx.lineCap     = 'round';
        pctx.lineJoin    = 'round';
        pctx.beginPath();
        pctx.moveTo(ax, ay);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          pctx.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t);
        }
        pctx.stroke();
      }

      render(); // initial frozen photo

      // ── Two-finger pinch zoom/pan on brush canvas ───────────
      function getTouchDist(t1, t2) {
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }
      function getTouchMid(t1, t2) {
        return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      }

      fc.addEventListener('touchstart', (e) => {
        touchCount = e.touches.length;
        if (e.touches.length === 2) {
          // Cancel any stroke that the first finger accidentally started
          if (drawing) {
            drawing = false;
            strkCtx.clearRect(0, 0, physW, physH);
            // Roll back the undo snapshot taken in pointerdown for that touch
            if (undoStack.length > 0) {
              maskCtx.putImageData(undoStack.pop(), 0, 0);
            }
            scheduleRender();
          }
          pinching = true;
          pinchJustEnded = false;
          const [t1, t2] = e.touches;
          pinchStartDist = getTouchDist(t1, t2) || 1;
          pinchStartScale = viewScale;
          pinchStartMid = getTouchMid(t1, t2);
          pinchStartTx = viewTx;
          pinchStartTy = viewTy;
          if (ghostEl) ghostEl.classList.remove('show');
          e.preventDefault();
        }
      }, { passive: false });

      fc.addEventListener('touchmove', (e) => {
        touchCount = e.touches.length;
        if (!pinching || e.touches.length !== 2) return;
        const [t1, t2] = e.touches;
        const dist = getTouchDist(t1, t2) || pinchStartDist;
        const mid = getTouchMid(t1, t2);

        viewScale = Math.max(1, Math.min(4, pinchStartScale * (dist / pinchStartDist)));
        viewTx = pinchStartTx + (mid.x - pinchStartMid.x);
        viewTy = pinchStartTy + (mid.y - pinchStartMid.y);
        clampView();
        scheduleRender();
        e.preventDefault();
      }, { passive: false });

      fc.addEventListener('touchend', (e) => {
        touchCount = e.touches.length;
        if (e.touches.length < 2) {
          if (pinching) pinchJustEnded = true; // block next pointerdown
          pinching = false;
        }
      }, { passive: true });

      fc.addEventListener('touchcancel', () => {
        touchCount = 0;
        if (pinching) pinchJustEnded = true;
        pinching = false;
      }, { passive: true });

      // ── Pointer events ───────────────────────────────────────
      fc.addEventListener('pointerdown', e => {
        if (pinching || touchCount > 1) return;
        if (!e.isPrimary) return;     // ignore secondary touches (pinch)
        // If we just finished a pinch gesture, swallow this first touch
        // to prevent an accidental dot/stroke from the finger lifting
        if (pinchJustEnded) { pinchJustEnded = false; return; }
        e.preventDefault();
        fc.setPointerCapture(e.pointerId);
        if (ghostEl) ghostEl.classList.remove('show');
        drawing = true;

        const p = toCanvasPoint(e.clientX, e.clientY);
        lx = p.x;
        ly = p.y;

        // Lock Y to the first stroke's line for single-line precision
        if (lineY === null) {
          lineY = ly;
        } else {
          const band = Math.max(brushR * 2.5, 30);
          ly = Math.max(lineY - band, Math.min(lineY + band, ly));
        }

        undoStack.push(maskCtx.getImageData(0, 0, physW, physH));
        if (undoStack.length > 30) undoStack.shift();

        strkCtx.clearRect(0, 0, physW, physH);
        strkCtx.fillStyle = BRUSH_COLOR;
        strkCtx.beginPath();
        strkCtx.arc(lx, ly, brushR, 0, Math.PI * 2);
        strkCtx.fill();
        scheduleRender();
      });

      fc.addEventListener('pointermove', e => {
        if (!drawing || !e.isPrimary) return;
        e.preventDefault();
        // getCoalescedEvents() returns ALL intermediate positions between frames.
        // Without this, fast swipes produce sparse events → gaps in stroke.
        const pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const pt of pts) {
          const p = toCanvasPoint(pt.clientX, pt.clientY);
          const cx = p.x;
          let   cy = p.y;
          // Clamp Y to the horizontal line band for single-line precision
          if (lineY !== null) {
            const band = Math.max(brushR * 2.5, 30);
            cy = Math.max(lineY - band, Math.min(lineY + band, cy));
          }
          brushSegment(strkCtx, lx, ly, cx, cy);
          lx = cx; ly = cy;
        }
        scheduleRender();
      });

      function endStroke(e) {
        if (!drawing) return;
        if (e && !e.isPrimary) return;
        drawing = false;
        maskCtx.save();
        // Commit as solid alpha mask so the selected area is fully kept visible.
        maskCtx.globalAlpha = 1;
        maskCtx.drawImage(strkC, 0, 0, dispW, dispH);
        maskCtx.restore();
        strkCtx.clearRect(0, 0, physW, physH);
        scheduleRender();
        confirmBtn.classList.remove('opacity-40', 'pointer-events-none');
        hintEl.textContent = '✓ Satır seçildi — yatay devam edin veya Tara\'ya dokunun';
      }
      fc.addEventListener('pointerup',     endStroke);
      fc.addEventListener('pointercancel', endStroke);

      // ── Undo ─────────────────────────────────────────────────
      undoBtn.onclick = () => {
        if (!undoStack.length) return;
        maskCtx.putImageData(undoStack.pop(), 0, 0);
        scheduleRender();
        if (!undoStack.length) {
          lineY = null;
          confirmBtn.classList.add('opacity-40', 'pointer-events-none');
          hintEl.textContent = 'Parmağınızla boyayın · 2 parmakla yakınlaştır';
        }
      };

      // ── Clear ────────────────────────────────────────────────
      clearBtn.onclick = () => {
        undoStack = [];
        lineY = null;
        maskCtx.clearRect(0, 0, physW, physH);
        strkCtx.clearRect(0, 0, physW, physH);
        scheduleRender();
        confirmBtn.classList.add('opacity-40', 'pointer-events-none');
        hintEl.textContent = 'Parmağınızla boyayın · 2 parmakla yakınlaştır';
      };

      // ── Cancel ───────────────────────────────────────────────
      cancelBtn.onclick = () => {
        view.classList.add('hidden');
        view.classList.remove('flex');
        clearTimeout(ghostTimer);
      };

      // ── Confirm → OCR ────────────────────────────────────────
      confirmBtn.onclick = async () => {
        const bb = _getBrushBoundingBox(maskC, dpr);
        if (!bb) { showToast('Lütfen önce bir alan boyayın.', 'brush'); return; }

        view.classList.add('hidden');
        view.classList.remove('flex');

        const st = document.getElementById('scan-status-text');
        const sd = document.getElementById('scan-status-dot');
        if (st) st.textContent = 'İŞLENİYOR';
        if (sd) { sd.classList.remove('bg-primary'); sd.classList.add('bg-yellow-400'); }

        const scaleX = srcCanvas.width  / iW;
        const scaleY = srcCanvas.height / iH;
        const cropX  = Math.round((bb.x - iX) * scaleX);
        const cropY  = Math.round((bb.y - iY) * scaleY);
        const cropW  = Math.round(bb.w * scaleX);
        const cropH  = Math.round(bb.h * scaleY);

        const cropped = buildMaskedOcrCanvas(cropX, cropY, cropW, cropH, scaleX, scaleY);
        const result  = await OCRModule.performOCR(cropped);

        // Limit to max 5 tokens for single-line precision
        if (result.tokens.length > 5) {
          result.tokens = result.tokens.slice(0, 5);
          result.text = result.tokens.join(' ');
        }
        if (result.wordsFound && result.wordsFound.length > 5) {
          result.wordsFound = result.wordsFound.slice(0, 5);
        }

        // Restore status indicator
        if (st) st.textContent = 'LIVE';
        if (sd) { sd.classList.remove('bg-yellow-400'); sd.classList.add('bg-primary'); }

        if (result.tokens.length > 0) {
          addScanHistory({ text: result.text, tokenCount: result.tokens.length });
          window._lastOCRResult = result;

          // Show instant quick-suggest panel instead of navigating away
          _showQuickSuggest(result);
        } else {
          showToast('Seçili alanda metin bulunamadı. Tekrar deneyin.', 'search_off');
        }
      };

    }); // end requestAnimationFrame
  }

  // ============================================================
  //  PAGE: OCR CAMERA SCAN
  // ============================================================
  function renderScan() {
    appRoot().innerHTML = `
      <div class="page relative flex flex-col w-full bg-black overflow-hidden" style="height:100dvh;">

        <!-- Camera Video -->
        <video id="camera-video" class="absolute inset-0 w-full h-full object-cover z-0" playsinline autoplay muted></video>

        <!-- Capture Flash Overlay (white flash on shutter) -->
        <div id="capture-flash" class="absolute inset-0 z-[25] pointer-events-none bg-white opacity-0"></div>

        <!-- Viewfinder blur strips — each panel covers one side outside the frame.
             Positioned by JS in bindScanEvents after camera starts. -->
        <div id="vf-blur-top"    class="absolute left-0 right-0 top-0 z-[2] pointer-events-none" style="backdrop-filter:blur(5px) brightness(0.42);-webkit-backdrop-filter:blur(5px) brightness(0.42);"></div>
        <div id="vf-blur-bottom" class="absolute left-0 right-0 z-[2] pointer-events-none" style="backdrop-filter:blur(5px) brightness(0.42);-webkit-backdrop-filter:blur(5px) brightness(0.42);"></div>
        <div id="vf-blur-left"   class="absolute left-0 z-[2] pointer-events-none" style="backdrop-filter:blur(5px) brightness(0.42);-webkit-backdrop-filter:blur(5px) brightness(0.42);"></div>
        <div id="vf-blur-right"  class="absolute right-0 z-[2] pointer-events-none" style="backdrop-filter:blur(5px) brightness(0.42);-webkit-backdrop-filter:blur(5px) brightness(0.42);"></div>

        <!-- Fallback (no camera) -->
        <div id="camera-fallback" class="absolute inset-0 w-full h-full z-0 hidden items-center justify-center bg-background-dark">
          <div class="text-center">
            <span class="material-symbols-outlined text-white/20 text-6xl mb-4 block">videocam_off</span>
            <p class="text-white/40 text-sm">Kamera erişimi sağlanamadı</p>
            <p class="text-white/30 text-xs mt-1">Galeriden görsel yükleyebilirsiniz</p>
          </div>
        </div>

        <!-- Top Control Bar (absolute overlay, stays above everything) -->
        <div class="absolute top-0 left-0 w-full z-20 px-4 pb-3 flex justify-between items-center"
             style="padding-top:max(env(safe-area-inset-top, 0px), 14px);">
          <button id="scan-back-btn" class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/12 text-white flex items-center justify-center active:scale-90 transition-transform">
            <span class="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/12">
            <span id="scan-status-dot" class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span id="scan-status-text" class="text-[11px] font-bold tracking-widest text-white/90">LIVE</span>
          </div>
          <button id="scan-flash-btn" class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/12 text-white flex items-center justify-center active:scale-90 transition-transform">
            <span class="material-symbols-outlined text-[22px]">flash_on</span>
          </button>
        </div>

        <!-- ─── Flex column layout overlay (z-10) ───────────────
             Top spacer = top bar height + safe area
             Middle flex-1 = viewfinder + hint centered
             Bottom = action bar, in normal flow (NOT absolute)
        -->
        <div class="absolute inset-0 z-10 flex flex-col"
             style="padding-top:calc(max(env(safe-area-inset-top, 0px), 14px) + 56px);">

          <!-- Viewfinder area: grows to fill available space, centers content -->
          <div class="flex-1 flex flex-col justify-center items-center" style="padding-bottom:110px;">
            <div id="scan-frame"
                 class="relative rounded-3xl"
                 style="width:82%; max-width:340px; aspect-ratio:3/4;
                        box-shadow: 0 0 0 100vmax rgba(0,0,0,0.72);">

              <!-- Frame border -->
              <div class="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none"></div>

              <!-- Crimson corner accents (glowing) -->
              <div class="absolute top-0 left-0   w-9 h-9 border-t-[3px] border-l-[3px] border-primary rounded-tl-3xl" style="filter:drop-shadow(0 0 8px rgba(199,0,36,0.95))"></div>
              <div class="absolute top-0 right-0  w-9 h-9 border-t-[3px] border-r-[3px] border-primary rounded-tr-3xl" style="filter:drop-shadow(0 0 8px rgba(199,0,36,0.95))"></div>
              <div class="absolute bottom-0 left-0  w-9 h-9 border-b-[3px] border-l-[3px] border-primary rounded-bl-3xl" style="filter:drop-shadow(0 0 8px rgba(199,0,36,0.95))"></div>
              <div class="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-primary rounded-br-3xl" style="filter:drop-shadow(0 0 8px rgba(199,0,36,0.95))"></div>

              <!-- Animated scan line (inside clipped container) -->
              <div class="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div class="w-full h-24 scan-line absolute top-[-20%]"></div>
              </div>

              <!-- Crosshair -->
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div class="w-8 h-0.5 bg-white rounded-full"></div>
                <div class="h-8 w-0.5 bg-white rounded-full absolute"></div>
              </div>
            </div>

            <!-- Hint label just below frame -->
            <div class="mt-5 px-4 py-2 rounded-full bg-black/55 backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-sm">center_focus_strong</span>
              <p class="text-[11px] font-medium text-white/80 tracking-wide">Metni çerçeve içine hizalayın</p>
            </div>
          </div>

          <!-- Bottom Action Bar: absolute bottom-0 so it's always pinned -->
          <div class="absolute bottom-0 left-0 right-0 z-20 px-4 pt-3 flex items-center justify-between glass-panel border-t border-white/5"
               style="padding-bottom:max(env(safe-area-inset-bottom, 0px), 34px);">

            <!-- Gallery -->
            <div class="flex flex-col items-center gap-1.5">
              <button id="scan-gallery-btn" class="w-12 h-12 rounded-2xl border border-white/20 bg-white/8 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
                <span class="material-symbols-outlined text-white/65 text-2xl">image</span>
              </button>
              <span class="text-[10px] text-white/45 uppercase tracking-wider">Galeri</span>
              <input type="file" id="scan-file-input" accept="image/*" class="hidden" />
            </div>

            <!-- Shutter -->
            <div class="relative flex items-center justify-center">
              <div class="absolute w-20 h-20 bg-primary/30 rounded-full blur-xl animate-pulse"></div>
              <button id="scan-capture-btn"
                      class="relative liquid-button flex items-center justify-center border-4 border-white/25 active:scale-95 transition-transform duration-100 group"
                      style="width:76px; height:76px; border-radius:50%;">
                <span class="material-symbols-outlined text-white text-[32px] group-active:scale-90 transition-transform">photo_camera</span>
              </button>
            </div>

            <!-- History -->
            <div class="flex flex-col items-center gap-1.5">
              <button id="scan-history-btn" class="w-12 h-12 rounded-2xl border border-white/12 bg-white/6 flex items-center justify-center active:scale-90 transition-transform">
                <span class="material-symbols-outlined text-white/65 text-2xl">history</span>
              </button>
              <span class="text-[10px] text-white/45 uppercase tracking-wider">Geçmiş</span>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════
             BRUSH SELECTION VIEW (shown after shutter press)
             ══════════════════════════════════════════════ -->
        <div id="crop-select-view" class="absolute inset-0 z-[30] hidden flex-col bg-black" style="animation: fadeIn 0.18s ease;">

          <!-- Header -->
          <div class="flex-shrink-0 flex items-center justify-between px-3 bg-black/95 border-b border-white/10"
               style="padding-top: max(env(safe-area-inset-top, 0px), 50px); padding-bottom: 12px;">
            <button id="crop-cancel-btn"
                    class="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-white/65 text-sm active:scale-90 transition-transform">
              <span class="material-symbols-outlined text-[18px]">close</span>
              İptal
            </button>
            <div class="text-center">
              <span class="text-white font-bold text-base block leading-tight">Alan Boyama</span>
              <span class="text-white/35 text-[10px]">Taranacak metni parmağınla işaretle</span>
            </div>
            <button id="crop-confirm-btn"
                    class="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary border border-primary/50 text-white text-sm font-bold opacity-40 pointer-events-none active:scale-90 transition-transform">
              <span class="material-symbols-outlined text-[18px]">document_scanner</span>
              Tara
            </button>
          </div>

          <!-- Brush canvas fills all remaining space -->
          <div class="flex-1 relative overflow-hidden bg-black">
            <canvas id="brush-canvas" style="display:block; width:100%; height:100%;"></canvas>
            <div id="brush-size-ghost" class="brush-size-ghost">
              <div id="brush-size-ghost-circle" class="brush-size-ghost-circle" style="width:44px;height:44px;"></div>
              <div id="brush-size-ghost-label" class="brush-size-ghost-label">22 px</div>
            </div>
          </div>

          <!-- Footer: hint + brush-size slider + undo/clear -->
          <div class="flex-shrink-0 px-4 pt-3 bg-black/95 border-t border-white/8 space-y-2.5"
               style="padding-bottom:max(env(safe-area-inset-bottom, 0px), 20px);">

            <!-- Hint -->
            <div class="flex items-center justify-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-violet-400 opacity-70 flex-shrink-0"></div>
              <p id="brush-hint" class="text-white/55 text-xs">Parmağınızla boyayın · 2 parmakla yakınlaştır</p>
            </div>

            <!-- Brush size slider -->
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-white/35" style="font-size:15px">brush</span>
              <input type="range" id="brush-size-slider" min="8" max="50" value="22"
                     class="brush-size-range flex-1">
              <span id="brush-size-label" class="text-violet-400 font-bold text-[11px] w-5 text-right">22</span>
            </div>

            <!-- Undo / Clear -->
            <div class="flex items-center justify-between">
              <button id="brush-undo-btn"
                      class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs active:scale-90 transition-transform">
                <span class="material-symbols-outlined text-[15px]">undo</span>
                Geri Al
              </button>
              <p class="text-white/20 text-[10px]">Küçük alan = hızlı OCR</p>
              <button id="brush-clear-btn"
                      class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs active:scale-90 transition-transform">
                <span class="material-symbols-outlined text-[15px]">ink_eraser</span>
                Temizle
              </button>
            </div>

          </div>
        </div>

        <!-- ══════════════════════════════════════════════
             QUICK SUGGEST PANEL (instant results after OCR)
             ══════════════════════════════════════════════ -->
        <div id="quick-suggest-panel"
             class="absolute inset-x-0 bottom-0 z-[35] transition-transform duration-300 ease-out"
             style="transform: translateY(100%);">
          <div class="bg-gradient-to-t from-[#0d0d0d] via-[#131313]/98 to-[#1a1a1a]/90 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.7)]"
               style="padding: 14px 20px max(env(safe-area-inset-bottom, 0px), 28px) 20px;">
            <div class="flex justify-center mb-3">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-primary text-lg">auto_awesome</span>
              <span class="text-white/60 text-sm font-semibold tracking-wide">Aradığınız bu mu?</span>
            </div>
            <div id="quick-suggest-content" class="max-h-[40vh] overflow-y-auto"></div>
            <div class="flex gap-3 mt-4">
              <button id="quick-suggest-all-btn"
                      class="flex-1 py-3 rounded-2xl bg-primary/90 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <span class="material-symbols-outlined text-[18px]">list_alt</span>
                Tüm Sonuçlar
              </button>
              <button id="quick-suggest-close-btn"
                      class="py-3 px-5 rounded-2xl bg-white/8 border border-white/10 text-white/60 font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <span class="material-symbols-outlined text-[18px]">close</span>
                Kapat
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
    bindScanEvents();
  }

  function bindScanEvents() {
    const video    = document.getElementById('camera-video');
    const fallback = document.getElementById('camera-fallback');

    // ── Start camera ─────────────────────────────────────────
    OCRModule.startCamera(video).then(success => {
      if (!success) {
        video.classList.add('hidden');
        fallback.classList.remove('hidden');
        fallback.classList.add('flex');
      } else {
        // Position the 4 backdrop-filter blur strips around the viewfinder frame
        requestAnimationFrame(() => {
          const frame = document.getElementById('scan-frame');
          if (!frame) return;
          const fr = frame.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const top = document.getElementById('vf-blur-top');
          const bot = document.getElementById('vf-blur-bottom');
          const lft = document.getElementById('vf-blur-left');
          const rgt = document.getElementById('vf-blur-right');
          if (top) top.style.height    = Math.max(0, fr.top)  + 'px';
          if (bot) { bot.style.top    = fr.bottom + 'px'; bot.style.height = Math.max(0, vh - fr.bottom) + 'px'; }
          if (lft) { lft.style.top    = fr.top + 'px'; lft.style.height = (fr.bottom - fr.top) + 'px'; lft.style.width = Math.max(0, fr.left) + 'px'; }
          if (rgt) { rgt.style.top    = fr.top + 'px'; rgt.style.height = (fr.bottom - fr.top) + 'px'; rgt.style.left = fr.right + 'px'; rgt.style.width = Math.max(0, vw - fr.right) + 'px'; }
        });
      }
    });

    // ── Pinch-to-zoom on camera ──────────────────────────────
    (function () {
      let prevDist = null;
      let curZoom  = 1;
      const page   = document.querySelector('#app > .page');
      if (!page) return;

      function touchDist(e) {
        const [t1, t2] = e.touches;
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }

      page.addEventListener('touchmove', e => {
        if (e.touches.length !== 2) { prevDist = null; return; }
        e.preventDefault();
        const dist = touchDist(e);
        if (prevDist !== null) {
          curZoom = Math.min(8, Math.max(1, curZoom * (dist / prevDist)));
          const track = OCRModule.getVideoTrack();
          if (track) {
            const caps = track.getCapabilities ? track.getCapabilities() : {};
            if (caps.zoom) {
              track.applyConstraints({
                advanced: [{ zoom: Math.min(caps.zoom.max, Math.max(caps.zoom.min, curZoom)) }]
              }).catch(() => {});
            }
          }
        }
        prevDist = dist;
      }, { passive: false });

      page.addEventListener('touchend',   () => { prevDist = null; }, { passive: true });
      page.addEventListener('touchcancel',() => { prevDist = null; }, { passive: true });
    })();

    // ── Navigation ───────────────────────────────────────────
    document.getElementById('scan-back-btn')?.addEventListener('click', () => {
      _hideQuickSuggest();
      OCRModule.stopCamera();
      window.navigateTo('home');
    });

    document.getElementById('scan-flash-btn')?.addEventListener('click', () => {
      OCRModule.toggleFlash();
    });

    document.getElementById('scan-history-btn')?.addEventListener('click', () => {
      OCRModule.stopCamera();
      window.navigateTo('history');
    });

    // ── Shutter button ───────────────────────────────────────
    document.getElementById('scan-capture-btn')?.addEventListener('click', () => {
      _hideQuickSuggest(); // dismiss any previous suggestion
      const flash = document.getElementById('capture-flash');

      // 1. White flash animation
      flash.classList.remove('flash-anim');
      void flash.offsetWidth; // force reflow to restart animation
      flash.classList.add('flash-anim');

      // 2. Capture full video frame
      const captured = OCRModule.captureFullFrame();
      if (!captured) {
        showToast('Kamera görüntüsü alınamadı.', 'error');
        return;
      }

      // 3. After flash settle, open brush-select view
      setTimeout(() => _showBrushView(captured), 230);
    });

    // ── Gallery / file import ────────────────────────────────
    document.getElementById('scan-gallery-btn')?.addEventListener('click', () => {
      document.getElementById('scan-file-input')?.click();
    });

    document.getElementById('scan-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const bitmap = await createImageBitmap(file);
        const c = document.createElement('canvas');
        c.width = bitmap.width;
        c.height = bitmap.height;
        c.getContext('2d').drawImage(bitmap, 0, 0);
        _showBrushView(c);
      } catch {
        showToast('Görsel yüklenemedi.', 'error');
      }
      e.target.value = '';
    });
  }

  // ============================================================
  //  PAGE: TEXT ANALYSIS RESULT
  // ============================================================
  function renderAnalysis() {
    const result = window._lastOCRResult || { text: 'OCR sonucu bulunamadı.', tokens: [], wordsFound: [] };
    const wordsFound = result.wordsFound || [];
    appRoot().innerHTML = `
      <div class="page relative flex flex-col min-h-screen w-full max-w-md mx-auto liquid-gradient-bg">
        <div class="fixed top-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col flex-1 w-full pb-24">
          <!-- Header -->
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 pb-4 backdrop-blur-md bg-surface-dark/90 border-b border-white/5" style="padding-top:max(env(safe-area-inset-top, 0px), 14px);">
            <button id="analysis-back-btn" class="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span class="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <h1 class="text-xl font-bold tracking-tight text-white">Metin Analizi</h1>
            <button id="analysis-rescan-btn" class="p-2 rounded-full hover:bg-white/10 transition-colors text-white" title="Tekrar Tara">
              <span class="material-symbols-outlined text-[24px]">refresh</span>
            </button>
          </header>

          <!-- OCR Result Text -->
          <div class="px-4 py-4">
            <div class="glass-panel rounded-2xl p-4 mb-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary text-lg">description</span>
                <span class="text-xs text-white/40 uppercase tracking-widest font-semibold">OCR Çıktısı</span>
              </div>
              <p class="text-white/80 text-sm leading-relaxed">${result.text}</p>
            </div>
          </div>

          <!-- Found Words from Dictionary -->
          ${wordsFound.length > 0 ? `
            <div class="px-4 mb-4">
              <div class="flex items-center gap-2 mb-3 ml-1">
                <span class="material-symbols-outlined text-primary text-lg">auto_stories</span>
                <span class="text-xs text-white/40 uppercase tracking-widest font-semibold">Lügatta Bulunan — ${wordsFound.length} kelime</span>
              </div>
              <div class="space-y-2">
                ${wordsFound.map(w => `
                  <button class="found-word-item w-full text-left glass-card rounded-2xl p-4 flex items-center gap-3 group" data-word="${w.word}">
                    <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span class="material-symbols-outlined text-primary text-[18px]">book_2</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline gap-2">
                        <span class="text-white font-bold text-sm">${w.word}</span>
                        ${w.root ? `<span class="text-[10px] text-white/25 font-medium">· ${w.root}</span>` : ''}
                      </div>
                      <span class="block text-white/45 text-xs leading-snug mt-0.5 line-clamp-2">${w.meaning ? w.meaning.substring(0, 100) : ''}</span>
                    </div>
                    <span class="material-symbols-outlined text-white/20 group-hover:text-primary text-xl flex-shrink-0 transition-colors">chevron_right</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Token Selection -->
          <div class="px-4 flex-1">
            <div class="flex items-center gap-2 mb-3 ml-1">
              <span class="material-symbols-outlined text-primary text-lg">token</span>
              <span class="text-xs text-white/40 uppercase tracking-widest font-semibold">Tüm Kelimeler — Seçmek için dokunun</span>
            </div>
            <div class="flex flex-wrap gap-2" id="token-list">
              ${result.tokens.map((t, i) => `
                <button class="token-chip" data-token="${t}" data-index="${i}">${t}</button>
              `).join('')}
            </div>
          </div>

          <!-- Selected word info area -->
          <div id="selected-word-area" class="px-4 mt-4 hidden">
            <div class="glass-panel rounded-2xl p-4">
              <div id="selected-word-content"></div>
            </div>
          </div>
        </div>

        ${bottomNav('scan')}
      </div>
    `;
    bindNavEvents();
    bindAnalysisEvents();
  }

  function bindAnalysisEvents() {
    document.getElementById('analysis-back-btn')?.addEventListener('click', () => window.navigateTo('home'));
    document.getElementById('analysis-rescan-btn')?.addEventListener('click', () => window.navigateTo('scan'));

    // Found words — direct click to modal
    document.querySelectorAll('.found-word-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = btn.getAttribute('data-word');
        const result = (typeof DictionaryModule.smartLookup === 'function')
          ? DictionaryModule.smartLookup(word)
          : DictionaryModule.lookup(word);
        if (result.found) showWordModal(result.entry, result.entries);
      });
    });

    document.querySelectorAll('.token-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        // Deselect all
        document.querySelectorAll('.token-chip').forEach(c => c.classList.remove('selected'));
        // Select this one
        chip.classList.add('selected');
        const word = chip.getAttribute('data-token');
        lookupAndShowWord(word);
      });
    });
  }

  function lookupAndShowWord(word) {
    const result = (typeof DictionaryModule.smartLookup === 'function')
      ? DictionaryModule.smartLookup(word)
      : DictionaryModule.lookup(word);
    if (result.found) {
      showWordModal(result.entry, result.entries);
    } else {
      // Show "not found" with suggestions
      const overlay = document.getElementById('word-modal-overlay');
      const modal = document.getElementById('word-modal');
      const content = document.getElementById('word-modal-content');

      content.innerHTML = `
        <div class="text-center mb-4">
          <span class="material-symbols-outlined text-white/30 text-5xl mb-3 block">search_off</span>
          <h2 class="text-xl font-bold text-white mb-1">"${word}"</h2>
          <p class="text-white/50 text-sm">Bu kelime lügatte bulunamadı.</p>
        </div>
        ${result.suggestions.length > 0 ? `
          <div class="mb-4">
            <h3 class="text-xs text-white/40 uppercase tracking-widest mb-2 text-center">Yakın Kelimeler</h3>
            <div class="flex flex-wrap gap-2 justify-center">
              ${result.suggestions.map(s => `
                <button class="suggestion-chip px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-primary/20 hover:border-primary/40 transition-colors" data-word="${s.word}">
                  ${s.word}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <button id="modal-close-btn" class="w-full mt-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 transition-colors">
          Kapat
        </button>
      `;

      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      requestAnimationFrame(() => { modal.style.transform = 'translateY(0)'; });

      document.getElementById('modal-close-btn')?.addEventListener('click', hideWordModal);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) hideWordModal(); });

      document.querySelectorAll('.suggestion-chip').forEach(s => {
        s.addEventListener('click', () => {
          hideWordModal();
          setTimeout(() => {
            const entry = (typeof DictionaryModule.smartLookup === 'function')
              ? DictionaryModule.smartLookup(s.getAttribute('data-word'))
              : DictionaryModule.lookup(s.getAttribute('data-word'));
            if (entry.found) showWordModal(entry.entry, entry.entries);
          }, 350);
        });
      });
    }
  }

  // ============================================================
  //  PAGE: SEARCH (Lûgat)
  // ============================================================
  function renderSearch() {
    appRoot().innerHTML = `
      <div class="page relative flex flex-col min-h-screen w-full max-w-md mx-auto liquid-gradient-bg">
        <div class="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col flex-1 w-full pb-24">
          <!-- Header -->
          <header class="sticky top-0 z-50 flex items-center gap-3 px-4 pb-4 backdrop-blur-md bg-surface-dark/90 border-b border-white/5"
                  style="padding-top:max(env(safe-area-inset-top, 0px), 14px);">
            <button id="search-back-btn" class="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span class="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <div class="flex-1 relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="material-symbols-outlined text-white/40 text-xl">search</span>
              </div>
              <input id="search-input" class="input-glass w-full rounded-2xl h-12 pl-10 pr-4 text-white placeholder:text-white/30 text-base" placeholder="Kelime ara..." type="text" autofocus />
            </div>
          </header>

          <!-- Results -->
          <div id="search-results" class="flex-1 px-4 py-4 overflow-y-auto">
            <div class="text-center py-20">
              <span class="material-symbols-outlined text-white/15 text-6xl block mb-3">menu_book</span>
              <p class="text-white/30 text-sm">Aramak için bir kelime yazın</p>
              <p class="text-white/15 text-xs mt-1">57.768 kelime mevcut</p>
            </div>
          </div>
        </div>

        ${bottomNav('search')}
      </div>
    `;
    bindNavEvents();
    bindSearchEvents();
  }

  function _renderWordItems(results) {
    if (!results || results.length === 0) {
      return `<div class="text-center py-16"><span class="material-symbols-outlined text-white/20 text-5xl block mb-3">search_off</span><p class="text-white/40 text-sm">Sonuç bulunamadı</p></div>`;
    }
    const limited = results.slice(0, 50);
    const more = results.length > 50 ? `<p class="text-center text-white/25 text-xs py-3">+${results.length - 50} daha… aramayı daraltın</p>` : '';
    return limited.map(w => `
      <button class="search-word-item w-full text-left glass-card rounded-2xl p-4 flex items-center justify-between group" data-word="${w.word}">
        <div class="flex-1 min-w-0">
          <span class="block text-white font-semibold text-base">${w.word}</span>
          <span class="block text-white/40 text-sm truncate mt-0.5">${w.meaning ? w.meaning.substring(0, 80) : ''}</span>
        </div>
        <span class="material-symbols-outlined text-white/20 group-hover:text-primary text-xl ml-3 flex-shrink-0">chevron_right</span>
      </button>
    `).join('') + more;
  }

  function bindSearchEvents() {
    document.getElementById('search-back-btn')?.addEventListener('click', () => window.navigateTo('home'));

    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');

    // Event delegation — one listener on the container instead of N listeners
    resultsContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.search-word-item');
      if (!btn) return;
      const word = btn.getAttribute('data-word');
      const result = DictionaryModule.lookup(word);
      if (result.found) showWordModal(result.entry, result.entries);
    });

    // Debounced search input
    let _searchTimer;
    input?.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        const q = input.value.trim();
        if (!q) {
          resultsContainer.innerHTML = `
            <div class="text-center py-20">
              <span class="material-symbols-outlined text-white/15 text-6xl block mb-3">menu_book</span>
              <p class="text-white/30 text-sm">Aramak için bir kelime yazın</p>
              <p class="text-white/15 text-xs mt-1">57.768 kelime mevcut</p>
            </div>`;
          return;
        }
        const results = DictionaryModule.search(q);
        resultsContainer.innerHTML = `<div class="space-y-2">${_renderWordItems(results)}</div>`;
      }, 200);
    });
  }

  function bindWordItemClicks() {
    // Kept for backward compatibility — event delegation is used now in bindSearchEvents
  }

  // ============================================================
  //  PAGE: FAVORITES
  // ============================================================
  function renderFavorites() {
    const favorites = FavoriteModule.getAll();
    appRoot().innerHTML = `
      <div class="page relative flex flex-col min-h-screen w-full max-w-md mx-auto liquid-gradient-bg">
        <div class="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col flex-1 w-full pb-24">
          <!-- Header -->
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 pb-4 backdrop-blur-md bg-surface-dark/90 border-b border-white/5" style="padding-top:max(env(safe-area-inset-top, 0px), 14px);">
            <button id="fav-back-btn" class="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span class="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <h1 class="text-xl font-bold tracking-tight text-white">Favoriler</h1>
            <div class="w-10 h-10 flex items-center justify-center">
              <span class="text-sm text-white/40 font-bold">${favorites.length}</span>
            </div>
          </header>

          <div class="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            ${favorites.length === 0 ? `
              <div class="text-center py-20">
                <span class="material-symbols-outlined text-white/15 text-6xl block mb-4">favorite_border</span>
                <p class="text-white/40 text-base font-medium mb-1">Henüz favori kelime yok</p>
                <p class="text-white/25 text-sm">Kelime detaylarında ♥ simgesine dokunarak ekleyebilirsiniz.</p>
              </div>
            ` : favorites.map(f => `
              <div class="glass-card rounded-2xl p-4 flex items-center justify-between group">
                <button class="fav-word-btn flex-1 text-left min-w-0" data-word="${f.word}">
                  <span class="block text-white font-semibold text-base">${f.word}</span>
                  <span class="block text-white/40 text-sm truncate mt-0.5">${f.meaning}</span>
                </button>
                <button class="fav-remove-btn p-2 rounded-full hover:bg-primary/20 transition-colors ml-2 flex-shrink-0" data-word="${f.word}">
                  <span class="material-symbols-outlined text-primary text-xl">favorite</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        ${bottomNav('favorites')}
      </div>
    `;
    bindNavEvents();

    document.getElementById('fav-back-btn')?.addEventListener('click', () => window.navigateTo('home'));

    document.querySelectorAll('.fav-word-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = btn.getAttribute('data-word');
        const result = DictionaryModule.lookup(word);
        if (result.found) showWordModal(result.entry, result.entries);
      });
    });

    document.querySelectorAll('.fav-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = btn.getAttribute('data-word');
        FavoriteModule.remove(word);
        showToast('Favorilerden çıkarıldı', 'favorite_border');
        renderFavorites(); // Re-render
      });
    });
  }

  // ============================================================
  //  PAGE: HISTORY
  // ============================================================
  function renderHistory() {
    const history = getScanHistory();
    appRoot().innerHTML = `
      <div class="page relative flex flex-col min-h-screen w-full max-w-md mx-auto liquid-gradient-bg">
        <div class="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[80px] opacity-30 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col flex-1 w-full pb-24">
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 pb-4 backdrop-blur-md bg-surface-dark/90 border-b border-white/5" style="padding-top:max(env(safe-area-inset-top, 0px), 14px);">
            <button id="history-back-btn" class="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span class="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <h1 class="text-xl font-bold tracking-tight text-white">Tarama Geçmişi</h1>
            <div class="w-10"></div>
          </header>

          <div class="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
            ${history.length === 0 ? `
              <div class="text-center py-20">
                <span class="material-symbols-outlined text-white/15 text-6xl block mb-4">history</span>
                <p class="text-white/40 text-base font-medium mb-1">Henüz tarama yapılmadı</p>
                <p class="text-white/25 text-sm">Kamera ile metin tarayarak başlayın.</p>
              </div>
            ` : history.map((h, i) => `
              <button class="history-item w-full text-left glass-card rounded-2xl p-4 group" data-index="${i}">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-lg">document_scanner</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="block text-white/50 text-xs">${new Date(h.date).toLocaleDateString('tr-TR')} • ${new Date(h.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span class="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">${h.tokenCount} kelime</span>
                </div>
                <p class="text-white/60 text-sm truncate">${h.text}</p>
              </button>
            `).join('')}
          </div>
        </div>

        ${bottomNav('home')}
      </div>
    `;
    bindNavEvents();
    document.getElementById('history-back-btn')?.addEventListener('click', () => window.navigateTo('home'));

    document.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'));
        const h = history[idx];
        if (h) {
          window._lastOCRResult = { text: h.text, tokens: OCRModule.tokenize(h.text) };
          window.navigateTo('analysis');
        }
      });
    });
  }

  // ============================================================
  //  PAGE: SETTINGS
  // ============================================================
  function renderSettings() {
    const settings = getSettings();
    appRoot().innerHTML = `
      <div class="page relative flex flex-col min-h-screen w-full max-w-md mx-auto liquid-gradient-bg">
        <div class="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div class="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

        <div class="relative z-10 flex flex-col flex-1 w-full pb-24">
          <!-- Header -->
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 pb-4 backdrop-blur-md bg-surface-dark/90 border-b border-white/5" style="padding-top:max(env(safe-area-inset-top, 0px), 14px);">
            <button id="settings-back-btn" class="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <span class="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <h1 class="text-xl font-bold tracking-tight text-white">Ayarlar</h1>
            <div class="w-10"></div>
          </header>

          <main class="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
            <!-- Reading Experience -->
            <section class="space-y-3">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-2">Okuma Deneyimi</h2>
              <div class="settings-glass rounded-2xl overflow-hidden">
                <!-- Font Size -->
                <div class="p-5 border-b border-white/5">
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined text-[20px]">format_size</span>
                      </div>
                      <span class="text-base font-medium">Font Boyutu</span>
                    </div>
                    <span id="font-size-value" class="text-sm text-gray-400 bg-white/5 px-2 py-1 rounded">${settings.fontSize}px</span>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="text-xs text-gray-400 font-medium">A</span>
                    <input id="font-size-slider" type="range" min="12" max="32" value="${settings.fontSize}" class="flex-1" />
                    <span class="text-lg text-white font-bold">A</span>
                  </div>
                </div>
                <!-- Arabic Clarity Toggle -->
                <div class="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[20px]">visibility</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-base font-medium">Arapça Netliği</span>
                      <span class="text-xs text-gray-400">OCR metin iyileştirmesi</span>
                    </div>
                  </div>
                  <div id="arabic-toggle" class="toggle-track ${settings.arabicClarity ? 'active' : ''}">
                    <div class="toggle-thumb"></div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Appearance -->
            <section class="space-y-3">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-2">Görünüm</h2>
              <div class="settings-glass rounded-2xl overflow-hidden p-1 flex items-center justify-between gap-1">
                <button data-theme="system" class="theme-btn flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all ${settings.theme === 'system' || settings.theme === 'dark' ? 'bg-white/10 border border-primary/50 text-white shadow-[0_0_15px_rgba(199,0,36,0.3)]' : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'}">
                  <div class="w-8 h-8 rounded-full bg-gray-900 border border-gray-700"></div>
                  <span class="text-xs font-medium">Sistem</span>
                </button>
                <button data-theme="dark" class="theme-btn flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all ${settings.theme === 'dark' ? '' : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'}">
                  <div class="w-8 h-8 rounded-full bg-[#1a1a1a] border border-gray-700"></div>
                  <span class="text-xs font-medium">Koyu</span>
                </button>
                <button data-theme="sepia" class="theme-btn flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all ${settings.theme === 'sepia' ? 'bg-white/10 border border-primary/50 text-white shadow-[0_0_15px_rgba(199,0,36,0.3)]' : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'}">
                  <div class="w-8 h-8 rounded-full bg-[#e8e0c9] border border-[#d4cbb3]"></div>
                  <span class="text-xs font-medium">Sepya</span>
                </button>
              </div>
            </section>

            <!-- Dictionary & Data -->
            <section class="space-y-3">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-2">Veri ve Lûgat</h2>
              <div class="settings-glass rounded-2xl overflow-hidden">
                <div class="flex items-center justify-between p-4 border-b border-white/5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[20px]">download_for_offline</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-base font-medium">Offline Lûgat</span>
                      <span class="text-xs text-gray-400">İnternetsiz kullanım</span>
                    </div>
                  </div>
                  <div id="offline-toggle" class="toggle-track ${settings.offlineDictionary ? 'active' : ''}">
                    <div class="toggle-thumb"></div>
                  </div>
                </div>
                <button id="clear-cache-btn" class="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left group">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                      <span class="material-symbols-outlined text-[20px]">delete_outline</span>
                    </div>
                    <span class="text-base font-medium text-gray-200 group-hover:text-white">Önbelleği Temizle</span>
                  </div>
                  <span class="material-symbols-outlined text-gray-500 group-hover:text-white text-[20px]">chevron_right</span>
                </button>
                <button id="clear-favorites-btn" class="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left group border-t border-white/5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                      <span class="material-symbols-outlined text-[20px]">heart_broken</span>
                    </div>
                    <span class="text-base font-medium text-gray-200 group-hover:text-white">Favorileri Temizle</span>
                  </div>
                  <span class="material-symbols-outlined text-gray-500 group-hover:text-white text-[20px]">chevron_right</span>
                </button>
              </div>
            </section>

            <!-- About -->
            <section class="space-y-3 pb-8">
              <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-2">Uygulama Hakkında</h2>
              <div class="settings-glass rounded-2xl overflow-hidden">
                <div class="flex items-center justify-between p-4 border-b border-white/5">
                  <span class="text-base font-medium text-gray-300">Sürüm</span>
                  <span class="text-sm text-gray-500 font-mono">v1.0.1</span>
                </div>
                <div class="flex items-center justify-between p-4">
                  <span class="text-base font-medium text-gray-300">Sözlük Sayısı</span>
                  <span class="text-sm text-primary font-bold">${DictionaryModule.getAll().length} kelime</span>
                </div>
              </div>
              <p class="text-center text-xs text-gray-600 mt-6">
                Risale-i Nur Külliyatı Okuma ve Araştırma Platformu<br/>
                © 2026 Tüm Hakları Saklıdır
              </p>
            </section>
          </main>
        </div>

        ${bottomNav('settings')}
      </div>
    `;
    bindNavEvents();
    bindSettingsEvents();
  }

  function bindSettingsEvents() {
    const settings = getSettings();

    document.getElementById('settings-back-btn')?.addEventListener('click', () => window.navigateTo('home'));

    // Font size slider
    const slider = document.getElementById('font-size-slider');
    const sizeLabel = document.getElementById('font-size-value');
    slider?.addEventListener('input', () => {
      settings.fontSize = parseInt(slider.value);
      sizeLabel.textContent = settings.fontSize + 'px';
      saveSettings(settings);
    });

    // Arabic clarity toggle
    document.getElementById('arabic-toggle')?.addEventListener('click', function() {
      this.classList.toggle('active');
      settings.arabicClarity = this.classList.contains('active');
      saveSettings(settings);
    });

    // Offline toggle
    document.getElementById('offline-toggle')?.addEventListener('click', function() {
      this.classList.toggle('active');
      settings.offlineDictionary = this.classList.contains('active');
      saveSettings(settings);
      showToast(settings.offlineDictionary ? 'Offline lûgat aktif' : 'Offline lûgat kapalı', 'download_for_offline');
    });

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.theme = btn.getAttribute('data-theme');
        saveSettings(settings);
        showToast('Tema değiştirildi', 'palette');
        renderSettings(); // Re-render to update active state
      });
    });

    // Clear cache
    document.getElementById('clear-cache-btn')?.addEventListener('click', () => {
      localStorage.removeItem('rnl_scan_history');
      showToast('Önbellek temizlendi', 'delete_outline');
    });

    // Clear favorites
    document.getElementById('clear-favorites-btn')?.addEventListener('click', () => {
      if (confirm('Tüm favoriler silinecek. Emin misiniz?')) {
        FavoriteModule.clear();
        showToast('Favoriler temizlendi', 'heart_broken');
      }
    });
  }

  // ============================================================
  //  PUBLIC API
  // ============================================================
  return {
    renderLogin,
    renderHome,
    renderScan,
    renderAnalysis,
    renderSearch,
    renderFavorites,
    renderHistory,
    renderSettings,
    showToast,
    showWordModal,
    hideWordModal,
  };
})();
