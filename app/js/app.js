/* ===== Risale-i Nur Lûgat — Main Application Entry ===== */

(async function () {
  'use strict';

  // Load dictionary data
  await DictionaryModule.load();

  /**
   * Simple client-side router
   * Supported pages: login, home, scan, analysis, search, favorites, history, settings
   */
  window.navigateTo = function (page) {
    // Stop camera if leaving scan page
    if (page !== 'scan') {
      OCRModule.stopCamera();
    }

    switch (page) {
      case 'login':
        UIModule.renderLogin();
        break;
      case 'home':
        UIModule.renderHome();
        break;
      case 'scan':
        UIModule.renderScan();
        break;
      case 'analysis':
        UIModule.renderAnalysis();
        break;
      case 'search':
        UIModule.renderSearch();
        break;
      case 'favorites':
        UIModule.renderFavorites();
        break;
      case 'history':
        UIModule.renderHistory();
        break;
      case 'settings':
        UIModule.renderSettings();
        break;
      default:
        UIModule.renderHome();
    }

    // Scroll to top on page change
    window.scrollTo(0, 0);
  };

  // Initial route: check if user is logged in
  if (UserModule.isLoggedIn()) {
    window.navigateTo('home');
  } else {
    window.navigateTo('login');
  }

  console.log('%c🔴 Risale-i Nur Lûgat v1.0.1', 'color: #c70024; font-size: 16px; font-weight: bold;');
  console.log('%cUygulama başarıyla yüklendi.', 'color: #999; font-size: 12px;');
})();
