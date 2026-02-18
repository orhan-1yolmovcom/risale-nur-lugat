/* ===== UserModule — Authentication & Session Management ===== */

const UserModule = (() => {
  const SESSION_KEY = 'rnl_user_session';

  /**
   * Get the current session from localStorage
   */
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  /**
   * Save session to localStorage
   */
  function saveSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  /**
   * Login with email + password (simulated)
   */
  function login(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!email || !password) {
          reject(new Error('E-posta ve şifre gereklidir.'));
          return;
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          reject(new Error('Geçerli bir e-posta adresi giriniz.'));
          return;
        }
        if (password.length < 4) {
          reject(new Error('Şifre en az 4 karakter olmalıdır.'));
          return;
        }
        const session = {
          email,
          displayName: email.split('@')[0],
          isGuest: false,
          loginAt: new Date().toISOString(),
        };
        saveSession(session);
        resolve(session);
      }, 600);
    });
  }

  /**
   * Continue as guest
   */
  function guestLogin() {
    const session = {
      email: null,
      displayName: 'Misafir',
      isGuest: true,
      loginAt: new Date().toISOString(),
    };
    saveSession(session);
    return session;
  }

  /**
   * Logout — clear session
   */
  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * Check if user is logged in
   */
  function isLoggedIn() {
    return getSession() !== null;
  }

  return { getSession, login, guestLogin, logout, isLoggedIn };
})();
