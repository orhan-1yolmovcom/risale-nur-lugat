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
  //  PAGE: OCR CAMERA SCAN  — helper: draw crop canvas state
  // ============================================================

  /**
   * Re-draws the crop canvas with the captured image and an optional
   * selection rectangle overlay.
   */
  function _drawCropState(ctx, srcCanvas, layout, sel) {
    const { dispW, dispH, imgDrawW, imgDrawH, imgOffX, imgOffY } = layout;
    ctx.clearRect(0, 0, dispW, dispH);

    // Black letterbox bars
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, dispW, dispH);

    // Draw the captured image (letterboxed)
    ctx.drawImage(srcCanvas, imgOffX, imgOffY, imgDrawW, imgDrawH);

    if (sel && sel.w > 4 && sel.h > 4) {
      // Darken everything outside the selection
      ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
      ctx.fillRect(imgOffX, imgOffY, imgDrawW, imgDrawH);

      // Restore the selected region (clear dark overlay, redraw image)
      ctx.save();
      ctx.beginPath();
      ctx.rect(sel.x, sel.y, sel.w, sel.h);
      ctx.clip();
      ctx.drawImage(srcCanvas, imgOffX, imgOffY, imgDrawW, imgDrawH);
      ctx.restore();

      // Crimson selection border
      ctx.strokeStyle = '#c70024';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.strokeRect(sel.x + 1, sel.y + 1, sel.w - 2, sel.h - 2);

      // Corner dot handles
      ctx.fillStyle = '#c70024';
      [[sel.x, sel.y], [sel.x + sel.w, sel.y],
       [sel.x, sel.y + sel.h], [sel.x + sel.w, sel.y + sel.h]].forEach(([hx, hy]) => {
        ctx.beginPath();
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Selection size hint (top-left corner)
      const wPx = Math.round(sel.w);
      const hPx = Math.round(sel.h);
      ctx.fillStyle = 'rgba(199,0,36,0.85)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`${wPx} × ${hPx}`, sel.x + 6, sel.y - 5 < 14 ? sel.y + 16 : sel.y - 5);
    }
  }

  /**
   * Shows the crop-selection overlay with the captured canvas.
   * Wires up all interaction (draw rectangle) and confirm/cancel buttons.
   */
  function _showCropView(srcCanvas) {
    const cropView   = document.getElementById('crop-select-view');
    const cropCanvas = document.getElementById('crop-canvas');
    const confirmBtn = document.getElementById('crop-confirm-btn');
    const cancelBtn  = document.getElementById('crop-cancel-btn');
    const hintEl     = document.getElementById('crop-hint');

    cropView.classList.remove('hidden');
    cropView.classList.add('flex');

    // Wait one frame so the element has its final layout dimensions
    requestAnimationFrame(() => {
      const dpr  = window.devicePixelRatio || 1;
      const rect = cropCanvas.getBoundingClientRect();
      const dispW = rect.width;
      const dispH = rect.height;

      cropCanvas.width  = Math.round(dispW  * dpr);
      cropCanvas.height = Math.round(dispH * dpr);

      const ctx = cropCanvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Letterbox: fit source image inside display area
      const imgAspect  = srcCanvas.width / srcCanvas.height;
      const dispAspect = dispW / dispH;
      let imgDrawW, imgDrawH, imgOffX, imgOffY;
      if (imgAspect > dispAspect) {
        imgDrawW = dispW;
        imgDrawH = dispW / imgAspect;
      } else {
        imgDrawH = dispH;
        imgDrawW = dispH * imgAspect;
      }
      imgOffX = (dispW - imgDrawW) / 2;
      imgOffY = (dispH - imgDrawH) / 2;

      const layout = { dispW, dispH, imgDrawW, imgDrawH, imgOffX, imgOffY };
      cropCanvas._layout    = layout;
      cropCanvas._srcCanvas = srcCanvas;
      cropCanvas._selection = null;

      // Initial render (no selection yet)
      _drawCropState(ctx, srcCanvas, layout, null);

      // ── Interaction ──────────────────────────────────────────
      let isDrawing = false;
      let startX = 0, startY = 0;

      function getPos(e) {
        const cr  = cropCanvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - cr.left, y: src.clientY - cr.top };
      }

      function onStart(e) {
        e.preventDefault();
        const p = getPos(e);
        startX = p.x; startY = p.y;
        isDrawing = true;
        cropCanvas._selection = null;
        confirmBtn.classList.add('opacity-40', 'pointer-events-none');
      }

      function onMove(e) {
        e.preventDefault();
        if (!isDrawing) return;
        const p = getPos(e);
        const sel = {
          x: Math.min(startX, p.x),
          y: Math.min(startY, p.y),
          w: Math.abs(p.x - startX),
          h: Math.abs(p.y - startY),
        };
        _drawCropState(ctx, srcCanvas, layout, sel);
        cropCanvas._selection = sel;
      }

      function onEnd(e) {
        if (!isDrawing) return;
        isDrawing = false;
        const sel = cropCanvas._selection;
        if (sel && sel.w > 18 && sel.h > 18) {
          confirmBtn.classList.remove('opacity-40', 'pointer-events-none');
          hintEl.textContent = '✓ Seçim hazır — tekrar çizebilir veya "Tara"ya basabilirsiniz';
        } else {
          cropCanvas._selection = null;
          _drawCropState(ctx, srcCanvas, layout, null);
          hintEl.textContent = 'Daha büyük bir alan seçin';
        }
      }

      // Clean up old listeners by cloning the canvas (prevents duplicates on re-open)
      const freshCanvas = cropCanvas.cloneNode(true);
      freshCanvas.width  = cropCanvas.width;
      freshCanvas.height = cropCanvas.height;
      cropCanvas.parentNode.replaceChild(freshCanvas, cropCanvas);

      // Re-draw on the fresh canvas
      const freshCtx = freshCanvas.getContext('2d');
      freshCtx.scale(dpr, dpr);
      freshCanvas._layout    = layout;
      freshCanvas._srcCanvas = srcCanvas;
      freshCanvas._selection = null;
      _drawCropState(freshCtx, srcCanvas, layout, null);

      freshCanvas.addEventListener('mousedown',  onStart);
      freshCanvas.addEventListener('mousemove',  onMove);
      freshCanvas.addEventListener('mouseup',    onEnd);
      freshCanvas.addEventListener('touchstart', onStart, { passive: false });
      freshCanvas.addEventListener('touchmove',  onMove,  { passive: false });
      freshCanvas.addEventListener('touchend',   onEnd);
    });

    // ── Cancel ───────────────────────────────────────────────
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newCancel.addEventListener('click', () => {
      cropView.classList.add('hidden');
      cropView.classList.remove('flex');
      document.getElementById('crop-hint').textContent = 'Sürükleyerek alan seçin';
      document.getElementById('crop-confirm-btn').classList.add('opacity-40', 'pointer-events-none');
    });

    // ── Confirm: crop → OCR ───────────────────────────────────
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    newConfirm.addEventListener('click', async () => {
      const canvas = document.getElementById('crop-canvas');
      const sel    = canvas._selection;
      const src    = canvas._srcCanvas;
      const layout = canvas._layout;
      if (!sel || !src || !layout) return;

      // Map display coords → source pixel coords
      const scaleX = src.width  / layout.imgDrawW;
      const scaleY = src.height / layout.imgDrawH;
      const srcX = Math.round((sel.x - layout.imgOffX) * scaleX);
      const srcY = Math.round((sel.y - layout.imgOffY) * scaleY);
      const srcW = Math.round(sel.w * scaleX);
      const srcH = Math.round(sel.h * scaleY);

      // Hide crop view & show processing status
      cropView.classList.add('hidden');
      cropView.classList.remove('flex');
      const statusText = document.getElementById('scan-status-text');
      const statusDot  = document.getElementById('scan-status-dot');
      if (statusText) { statusText.textContent = 'İŞLENİYOR'; }
      if (statusDot)  { statusDot.classList.replace('bg-primary', 'bg-yellow-400'); }

      // Crop selected area and run OCR
      const croppedCanvas = OCRModule.cropForOCR(src, srcX, srcY, srcW, srcH);
      const result = await OCRModule.performOCR(croppedCanvas);
      OCRModule.stopCamera();

      if (result.tokens.length > 0) {
        addScanHistory({ text: result.text, tokenCount: result.tokens.length });
        window._lastOCRResult = result;
        window.navigateTo('analysis');
      } else {
        showToast('Seçili alanda metin bulunamadı. Tekrar deneyin.', 'search_off');
        // Restart camera so user can try again
        const video = document.getElementById('camera-video');
        if (video) {
          OCRModule.startCamera(video);
          if (statusText) statusText.textContent = 'LIVE';
          if (statusDot)  statusDot.classList.replace('bg-yellow-400', 'bg-primary');
        }
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

        <!-- Capture Flash Overlay (white flash on shutter) -->
        <div id="capture-flash" class="absolute inset-0 z-[25] pointer-events-none bg-white opacity-0"></div>

        <!-- Fallback (no camera) -->
        <div id="camera-fallback" class="absolute inset-0 w-full h-full z-0 hidden items-center justify-center bg-background-dark">
          <div class="text-center">
            <span class="material-symbols-outlined text-white/20 text-6xl mb-4 block">videocam_off</span>
            <p class="text-white/40 text-sm">Kamera erişimi sağlanamadı</p>
            <p class="text-white/30 text-xs mt-1">Galeriden görsel yükleyebilirsiniz</p>
          </div>
        </div>

        <!-- Top Control Bar -->
        <div class="absolute top-0 left-0 w-full z-20 pt-12 pb-4 px-6 flex justify-between items-center">
          <button id="scan-back-btn" class="p-2.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white active:scale-90 transition-transform">
            <span class="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
            <span id="scan-status-dot" class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span id="scan-status-text" class="text-[11px] font-bold tracking-widest text-white/90">LIVE</span>
          </div>
          <button id="scan-flash-btn" class="p-2.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white active:scale-90 transition-transform">
            <span class="material-symbols-outlined text-[24px]">flash_on</span>
          </button>
        </div>

        <!-- ─── Viewfinder ───
             box-shadow: 0 0 0 100vmax rgba(0,0,0,N)  ← darkens everything OUTSIDE the frame
             No background on the element → video shows through inside (clear view)
        -->
        <div class="relative z-10 w-full h-full flex flex-col justify-center items-center pb-28">
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

          <!-- Hint label (above bottom bar, below frame) -->
          <div class="mt-7 px-5 py-2 rounded-full bg-black/55 backdrop-blur-sm border border-white/10 flex items-center gap-2"
               style="position:relative; z-index:20;">
            <span class="material-symbols-outlined text-primary text-sm">center_focus_strong</span>
            <p class="text-[11px] font-medium text-white/80 tracking-wide">Metni çerçeve içine hizalayın</p>
          </div>
        </div>

        <!-- Bottom Action Bar -->
        <div class="absolute bottom-0 left-0 w-full z-20 pb-10 pt-14 px-8
                    bg-gradient-to-t from-black via-black/80 to-transparent
                    flex items-end justify-between">
          <!-- Gallery -->
          <div class="flex flex-col items-center gap-1.5">
            <button id="scan-gallery-btn" class="w-14 h-14 rounded-2xl border-2 border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
              <span class="material-symbols-outlined text-white/60 text-2xl">image</span>
            </button>
            <span class="text-[10px] text-white/50 uppercase tracking-wider">Galeri</span>
            <input type="file" id="scan-file-input" accept="image/*" class="hidden" />
          </div>

          <!-- Shutter -->
          <div class="relative -top-3">
            <div class="absolute inset-0 bg-primary/40 rounded-full blur-xl animate-pulse"></div>
            <button id="scan-capture-btn"
                    class="relative liquid-button flex items-center justify-center border-4 border-white/20 active:scale-95 transition-transform duration-100 group"
                    style="width:92px; height:92px; border-radius:50%;">
              <span class="material-symbols-outlined text-white text-[40px] group-active:scale-90 transition-transform">photo_camera</span>
            </button>
          </div>

          <!-- History -->
          <div class="flex flex-col items-center gap-1.5">
            <button id="scan-history-btn" class="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
              <span class="material-symbols-outlined text-white/70 text-2xl">history</span>
            </button>
            <span class="text-[10px] text-white/50 uppercase tracking-wider">Geçmiş</span>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════
             CROP SELECTION VIEW (shown after shutter press)
             ══════════════════════════════════════════════ -->
        <div id="crop-select-view" class="absolute inset-0 z-[30] hidden flex-col bg-black" style="animation: fadeIn 0.2s ease;">

          <!-- Header -->
          <div class="flex-shrink-0 flex items-center justify-between px-4 bg-black/95 border-b border-white/10"
               style="padding-top: max(env(safe-area-inset-top, 0px), 48px); padding-bottom: 14px;">
            <button id="crop-cancel-btn"
                    class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white/70 text-sm active:scale-95 transition-transform">
              <span class="material-symbols-outlined text-base">close</span>
              İptal
            </button>
            <div class="text-center">
              <span class="text-white font-bold text-base block">Alan Seç</span>
              <span class="text-white/35 text-[11px]">Taranacak bölgeyi işaretle</span>
            </div>
            <button id="crop-confirm-btn"
                    class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary border border-primary/50 text-white text-sm font-bold opacity-40 pointer-events-none active:scale-95 transition-transform">
              <span class="material-symbols-outlined text-base">crop_free</span>
              Tara
            </button>
          </div>

          <!-- Interactive crop canvas (fills remaining height) -->
          <div class="flex-1 relative overflow-hidden bg-black">
            <canvas id="crop-canvas" class="w-full h-full" style="display:block; touch-action:none; cursor:crosshair;"></canvas>
          </div>

          <!-- Footer -->
          <div class="flex-shrink-0 px-4 py-4 bg-black/95 border-t border-white/8 flex flex-col items-center gap-1">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-base">touch_app</span>
              <p id="crop-hint" class="text-white/60 text-sm">Sürükleyerek alan seçin</p>
            </div>
            <p class="text-white/28 text-xs">Küçük bölge seçmek OCR'yi hızlandırır ve doğruluğu artırır</p>
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
      }
    });

    // ── Navigation ───────────────────────────────────────────
    document.getElementById('scan-back-btn')?.addEventListener('click', () => {
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

      // 3. After flash settle, open crop view
      setTimeout(() => _showCropView(captured), 230);
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
        _showCropView(c);
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
