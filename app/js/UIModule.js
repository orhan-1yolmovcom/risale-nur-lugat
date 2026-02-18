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
  function showWordModal(entry) {
    const overlay = document.getElementById('word-modal-overlay');
    const modal = document.getElementById('word-modal');
    const content = document.getElementById('word-modal-content');
    if (!overlay || !modal || !content) return;

    const isFav = FavoriteModule.isFavorite(entry.word);
    content.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold text-white">${entry.word}</h2>
          ${entry.root ? `<span class="text-xs text-white/40 mt-1 block">Kök: ${entry.root}</span>` : ''}
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
      <div class="glass-card rounded-2xl p-4 mb-4">
        <p class="text-white/90 text-base leading-relaxed">${entry.meaning}</p>
      </div>
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
      <nav class="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/5 pb-5 pt-3 px-4">
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
  //  PAGE: OCR CAMERA SCAN
  // ============================================================
  function renderScan() {
    appRoot().innerHTML = `
      <div class="page relative flex flex-col h-screen w-full bg-black overflow-hidden">
        <!-- Camera Video -->
        <video id="camera-video" class="absolute inset-0 w-full h-full object-cover z-0" playsinline autoplay muted></video>
        <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-[1]"></div>

        <!-- Fallback (no camera) -->
        <div id="camera-fallback" class="absolute inset-0 w-full h-full z-0 hidden items-center justify-center bg-background-dark">
          <div class="text-center">
            <span class="material-symbols-outlined text-white/20 text-6xl mb-4 block">videocam_off</span>
            <p class="text-white/40 text-sm">Kamera erişimi sağlanamadı</p>
            <p class="text-white/30 text-xs mt-1">Galeriden görsel yükleyebilirsiniz</p>
          </div>
        </div>

        <!-- Top Control Bar -->
        <div class="absolute top-0 left-0 w-full z-20 pt-12 pb-4 px-6 flex justify-between items-center glass-panel rounded-b-3xl border-t-0 border-x-0">
          <button id="scan-back-btn" class="p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors text-white">
            <span class="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>
          <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
            <span id="scan-status-dot" class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span id="scan-status-text" class="text-xs font-medium tracking-wide text-white/90">LIVE TEXT</span>
          </div>
          <button id="scan-flash-btn" class="p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors text-white">
            <span class="material-symbols-outlined text-[28px]">flash_on</span>
          </button>
        </div>

        <!-- Focus Frame -->
        <div class="relative z-10 w-full h-full flex flex-col justify-center items-center pb-32">
          <div class="relative w-[85%] aspect-[3/4] max-w-sm rounded-3xl overflow-hidden">
            <div class="absolute inset-0 bg-white/5 backdrop-blur-[1px] border border-white/20 rounded-3xl"></div>
            <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl shadow-[0_0_10px_rgba(199,0,36,0.6)]"></div>
            <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl shadow-[0_0_10px_rgba(199,0,36,0.6)]"></div>
            <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl shadow-[0_0_10px_rgba(199,0,36,0.6)]"></div>
            <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl shadow-[0_0_10px_rgba(199,0,36,0.6)]"></div>
            <div class="absolute inset-0 w-full h-full overflow-hidden rounded-3xl">
              <div class="w-full h-32 scan-line absolute top-[-20%]"></div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-12 h-1 bg-white/30 rounded-full"></div>
              <div class="h-12 w-1 bg-white/30 rounded-full absolute"></div>
            </div>
          </div>
          <div class="mt-8 px-5 py-2.5 glass-panel rounded-full flex items-center gap-2 shadow-lg">
            <span class="material-symbols-outlined text-primary text-sm">center_focus_strong</span>
            <p class="text-sm font-medium text-white/90 tracking-wide">Metni kırmızı çerçeve içine hizalayın</p>
          </div>
        </div>

        <!-- Bottom Action Bar -->
        <div class="absolute bottom-0 left-0 w-full z-20 pb-10 pt-20 px-8 bg-gradient-to-t from-black via-black/80 to-transparent flex items-end justify-between">
          <!-- Gallery / Import -->
          <div class="flex flex-col items-center gap-1">
            <button id="scan-gallery-btn" class="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 hover:border-primary transition-colors bg-white/5 flex items-center justify-center">
              <span class="material-symbols-outlined text-white/60 text-2xl">image</span>
            </button>
            <span class="text-[10px] font-medium text-white/60 tracking-wider uppercase">Galeri</span>
            <input type="file" id="scan-file-input" accept="image/*" class="hidden" />
          </div>
          <!-- Primary Capture -->
          <div class="relative -top-4">
            <div class="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse"></div>
            <button id="scan-capture-btn" class="relative w-24 h-24 rounded-full liquid-button flex items-center justify-center border-4 border-white/10 active:scale-95 transition-transform duration-100 group">
              <div class="absolute inset-0 rounded-full border border-white/20"></div>
              <span class="material-symbols-outlined text-white text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] group-active:scale-90 transition-transform">filter_center_focus</span>
            </button>
          </div>
          <!-- History -->
          <div class="flex flex-col items-center gap-1">
            <button id="scan-history-btn" class="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/10 transition-colors">
              <span class="material-symbols-outlined text-white/90 text-2xl">history</span>
            </button>
            <span class="text-[10px] font-medium text-white/60 tracking-wider uppercase">Geçmiş</span>
          </div>
        </div>
      </div>
    `;
    bindScanEvents();
  }

  function bindScanEvents() {
    const video = document.getElementById('camera-video');
    const fallback = document.getElementById('camera-fallback');

    // Start camera
    OCRModule.startCamera(video).then(success => {
      if (!success) {
        video.classList.add('hidden');
        fallback.classList.remove('hidden');
        fallback.classList.add('flex');
      }
    });

    document.getElementById('scan-back-btn')?.addEventListener('click', () => {
      OCRModule.stopCamera();
      window.navigateTo('home');
    });

    document.getElementById('scan-flash-btn')?.addEventListener('click', () => {
      OCRModule.toggleFlash();
    });

    document.getElementById('scan-capture-btn')?.addEventListener('click', async () => {
      const captureBtn = document.getElementById('scan-capture-btn');
      const statusText = document.getElementById('scan-status-text');
      const statusDot  = document.getElementById('scan-status-dot');

      // Disable button to prevent double-tap
      captureBtn.style.pointerEvents = 'none';
      captureBtn.style.opacity = '0.5';
      statusText.textContent = 'TARANIYOR...';
      statusDot.classList.add('bg-yellow-400');
      statusDot.classList.remove('bg-primary');

      try {
        const canvas = OCRModule.captureFrame();
        const result = await OCRModule.performOCR(canvas);

        OCRModule.stopCamera();

        if (result.tokens.length > 0) {
          addScanHistory({ text: result.text, tokenCount: result.tokens.length });
          window._lastOCRResult = result;
          window.navigateTo('analysis');
        } else {
          // No text found — let user retry
          captureBtn.style.pointerEvents = '';
          captureBtn.style.opacity = '';
          statusText.textContent = 'METİN BULUNAMADI';
          statusDot.classList.remove('bg-yellow-400');
          statusDot.classList.add('bg-red-500');
          showToast('Metin tespit edilemedi. Tekrar deneyin.', 'search_off');
          setTimeout(() => {
            statusText.textContent = 'LIVE TEXT';
            statusDot.classList.remove('bg-red-500');
            statusDot.classList.add('bg-primary');
          }, 2500);
        }
      } catch (err) {
        console.error('[Scan] Capture error:', err);
        captureBtn.style.pointerEvents = '';
        captureBtn.style.opacity = '';
        statusText.textContent = 'HATA';
        showToast('Tarama hatası: ' + err.message, 'error');
        setTimeout(() => { statusText.textContent = 'LIVE TEXT'; }, 2500);
      }
    });

    document.getElementById('scan-gallery-btn')?.addEventListener('click', () => {
      document.getElementById('scan-file-input')?.click();
    });

    document.getElementById('scan-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const result = await OCRModule.performOCRFromImage(file);
        OCRModule.stopCamera();

        if (result.tokens.length > 0) {
          addScanHistory({ text: result.text, tokenCount: result.tokens.length });
          window._lastOCRResult = result;
          window.navigateTo('analysis');
        } else {
          showToast('Görselde metin tespit edilemedi.', 'search_off');
        }
      } catch (err) {
        console.error('[Scan] Image OCR error:', err);
        showToast('Görsel analiz hatası.', 'error');
      }
      // Reset file input so same file can be selected again
      e.target.value = '';
    });

    document.getElementById('scan-history-btn')?.addEventListener('click', () => {
      OCRModule.stopCamera();
      window.navigateTo('history');
    });
  }

  // ============================================================
  //  PAGE: TEXT ANALYSIS RESULT
  // ============================================================
  function renderAnalysis() {
    const result = window._lastOCRResult || { text: 'OCR sonucu bulunamadı.', tokens: [] };
    appRoot().innerHTML = `
      <div class="page relative flex flex-col min-h-screen w-full max-w-md mx-auto liquid-gradient-bg">
        <div class="fixed top-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col flex-1 w-full pb-24">
          <!-- Header -->
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
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

          <!-- Token Selection -->
          <div class="px-4 flex-1">
            <div class="flex items-center gap-2 mb-3 ml-1">
              <span class="material-symbols-outlined text-primary text-lg">token</span>
              <span class="text-xs text-white/40 uppercase tracking-widest font-semibold">Kelimeler — Seçmek için dokunun</span>
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
    const result = DictionaryModule.lookup(word);
    if (result.found) {
      showWordModal(result.entry);
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
            const entry = DictionaryModule.lookup(s.getAttribute('data-word'));
            if (entry.found) showWordModal(entry.entry);
          }, 350);
        });
      });
    }
  }

  // ============================================================
  //  PAGE: SEARCH (Lûgat)
  // ============================================================
  function renderSearch() {
    const allWords = DictionaryModule.getAll();
    appRoot().innerHTML = `
      <div class="page relative flex flex-col min-h-screen w-full max-w-md mx-auto liquid-gradient-bg">
        <div class="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col flex-1 w-full pb-24">
          <!-- Header -->
          <header class="sticky top-0 z-50 flex items-center gap-3 px-4 py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
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
          <div id="search-results" class="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            ${allWords.map(w => `
              <button class="search-word-item w-full text-left glass-card rounded-2xl p-4 flex items-center justify-between group" data-word="${w.word}">
                <div class="flex-1 min-w-0">
                  <span class="block text-white font-semibold text-base">${w.word}</span>
                  <span class="block text-white/40 text-sm truncate mt-0.5">${w.meaning}</span>
                </div>
                <span class="material-symbols-outlined text-white/20 group-hover:text-primary text-xl ml-3 flex-shrink-0">chevron_right</span>
              </button>
            `).join('')}
          </div>
        </div>

        ${bottomNav('search')}
      </div>
    `;
    bindNavEvents();
    bindSearchEvents();
  }

  function bindSearchEvents() {
    document.getElementById('search-back-btn')?.addEventListener('click', () => window.navigateTo('home'));

    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');

    input?.addEventListener('input', () => {
      const q = input.value.trim();
      const results = q ? DictionaryModule.search(q) : DictionaryModule.getAll();
      resultsContainer.innerHTML = results.length === 0
        ? `<div class="text-center py-16"><span class="material-symbols-outlined text-white/20 text-5xl block mb-3">search_off</span><p class="text-white/40 text-sm">Sonuç bulunamadı</p></div>`
        : results.map(w => `
          <button class="search-word-item w-full text-left glass-card rounded-2xl p-4 flex items-center justify-between group" data-word="${w.word}">
            <div class="flex-1 min-w-0">
              <span class="block text-white font-semibold text-base">${w.word}</span>
              <span class="block text-white/40 text-sm truncate mt-0.5">${w.meaning}</span>
            </div>
            <span class="material-symbols-outlined text-white/20 group-hover:text-primary text-xl ml-3 flex-shrink-0">chevron_right</span>
          </button>
        `).join('');
      bindWordItemClicks();
    });

    bindWordItemClicks();
  }

  function bindWordItemClicks() {
    document.querySelectorAll('.search-word-item').forEach(item => {
      item.addEventListener('click', () => {
        const word = item.getAttribute('data-word');
        const result = DictionaryModule.lookup(word);
        if (result.found) showWordModal(result.entry);
      });
    });
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
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
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
        if (result.found) showWordModal(result.entry);
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
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
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
          <header class="sticky top-0 z-50 flex items-center justify-between px-4 py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
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
