/**
 * UserModule - Handles user authentication and session management
 */
export class UserModule {
    constructor() {
        this.currentUser = this.loadSession();
    }

    /**
     * Login with email and password
     */
    login(email, password) {
        const user = {
            email: email,
            isGuest: false,
            loginTime: new Date().toISOString()
        };
        
        this.currentUser = user;
        this.saveSession(user);
        return user;
    }

    /**
     * Login as guest
     */
    loginAsGuest() {
        const user = {
            email: 'guest@risalenur.com',
            isGuest: true,
            loginTime: new Date().toISOString()
        };
        
        this.currentUser = user;
        this.saveSession(user);
        return user;
    }

    /**
     * Logout
     */
    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Save session to storage
     */
    saveSession(user) {
        sessionStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
    }

    /**
     * Load session from storage
     */
    loadSession() {
        const sessionUser = sessionStorage.getItem('user');
        const localUser = localStorage.getItem('user');
        
        if (sessionUser) {
            return JSON.parse(sessionUser);
        } else if (localUser) {
            const user = JSON.parse(localUser);
            sessionStorage.setItem('user', JSON.stringify(user));
            return user;
        }
        
        return null;
    }
}
