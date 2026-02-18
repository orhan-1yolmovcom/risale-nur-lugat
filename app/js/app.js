/* ===== Risale-i Nur Lûgat — Main Application Entry ===== */

(function () {
  'use strict';

  /**
   * Simple client-side router
   */
  window.navigateTo = function (page) {
    if (page !== 'scan') OCRModule.stopCamera();

    switch (page) {
      case 'login':     UIModule.renderLogin();     break;
      case 'home':      UIModule.renderHome();      break;
      case 'scan':      UIModule.renderScan();      break;
      case 'analysis':  UIModule.renderAnalysis();  break;
      case 'search':    UIModule.renderSearch();    break;
      case 'favorites': UIModule.renderFavorites(); break;
      case 'history':   UIModule.renderHistory();   break;
      case 'settings':  UIModule.renderSettings();  break;
      default:          UIModule.renderHome();
    }
    window.scrollTo(0, 0);
  };

  // Render UI immediately — don't wait for dictionary
  if (UserModule.isLoggedIn()) {
    window.navigateTo('home');
  } else {
    window.navigateTo('login');
  }

  console.log('%c🔴 Risale-i Nur Lûgat v1.0.1', 'color: #c70024; font-size: 16px; font-weight: bold;');

  // Load dictionary in background — non-blocking
  DictionaryModule.load()
    .then(() => console.log('%cSözlük hazır ✓', 'color: #4ade80; font-size: 12px;'))
    .catch(err => console.warn('[app] Sözlük yüklenemedi:', err.message));
})();

