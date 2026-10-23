/**
 * QuantaLearn AI — Authentication Service.
 * Supports email/password (with SHA-256 hashing), Google sign-in simulation,
 * and offline-first guest sessions.
 */

const USERS_STORAGE_KEY = 'quantalearn_auth_users';
const SESSION_STORAGE_KEY = 'quantalearn_auth_session';
const USER_PERSIST_KEY = 'quantalearn_auth_user';

// Synchronous SHA-256 for browser and Node.js environments
async function sha256Hex(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback for Node.js test environment
  try {
    const nodeCrypto = await import('node:crypto');
    return nodeCrypto.createHash('sha256').update(text).digest('hex');
  } catch {
    // Basic fallback hash if crypto unavailable
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

class AuthService {
  constructor() {
    this._currentUser = null;
    this._listeners = new Set();
    this._initSeedUsers();
    this._restoreSession();
  }

  async _initSeedUsers() {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing = localStorage.getItem(USERS_STORAGE_KEY);
      if (!existing) {
        const seedUsers = {
          'instructor@quantalearn.ai': {
            uid: 'inst_001',
            email: 'instructor@quantalearn.ai',
            passwordHash: await sha256Hex('admin123'),
            displayName: 'Lead Quantum Instructor',
            role: 'instructor',
            level: 'master',
            densityMode: 'dense',
            college: 'VTU School of Quantum Tech',
            createdAt: Date.now()
          },
          'student@quantalearn.ai': {
            uid: 'stud_001',
            email: 'student@quantalearn.ai',
            passwordHash: await sha256Hex('admin123'),
            displayName: 'Quantum Student',
            role: 'student',
            level: 'intermediate',
            densityMode: 'compact',
            college: 'VTU Autonomous',
            createdAt: Date.now()
          }
        };
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seedUsers));
      }
    } catch (e) {
      console.warn('AuthService seed init failed:', e);
    }
  }

  _restoreSession() {
    try {
      let raw = null;
      if (typeof sessionStorage !== 'undefined') {
        raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      }
      if (!raw && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(USER_PERSIST_KEY);
      }
      if (raw) {
        const user = JSON.parse(raw);
        if (user && user.uid) {
          delete user.passwordHash;
          this._currentUser = user;
        }
      }
    } catch (e) {
      console.warn('AuthService session restoration failed:', e);
    }
  }

  _saveSession(user) {
    const cleanUser = { ...user };
    delete cleanUser.passwordHash;
    this._currentUser = cleanUser;

    try {
      const serialized = JSON.stringify(cleanUser);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(USER_PERSIST_KEY, serialized);
      }
    } catch (e) {
      console.warn('Failed to persist session:', e);
    }

    this._notifyListeners();
    return cleanUser;
  }

  _notifyListeners() {
    for (const callback of this._listeners) {
      try {
        callback(this._currentUser);
      } catch (err) {
        console.error('Auth state listener error:', err);
      }
    }
  }

  get currentUser() {
    return this._currentUser;
  }

  onAuthStateChanged(callback) {
    this._listeners.add(callback);
    callback(this._currentUser);
    return () => this._listeners.delete(callback);
  }

  async signUpWithEmail(email, password, metadata = {}) {
    if (!email || !email.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters in length.');
    }

    await this._initSeedUsers();
    let users = {};
    try {
      users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
    } catch {
      users = {};
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (users[normalizedEmail]) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await sha256Hex(password);
    const uid = 'usr_' + Math.random().toString(36).substring(2, 10);

    const newUserRecord = {
      uid,
      email: normalizedEmail,
      passwordHash,
      displayName: metadata.displayName || normalizedEmail.split('@')[0],
      role: metadata.role || 'student',
      academicRole: metadata.academicRole || 'undergraduate',
      level: metadata.level || 'beginner',
      densityMode: metadata.densityMode || 'comfortable',
      mathBackground: metadata.mathBackground || 'foundational',
      quantumBackground: metadata.quantumBackground || 'none',
      placementScore: metadata.placementScore ?? 0,
      onboarded: metadata.onboarded ?? false,
      college: metadata.college || '',
      createdAt: Date.now()
    };

    users[normalizedEmail] = newUserRecord;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return this._saveSession(newUserRecord);
  }

  async signInWithEmail(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    await this._initSeedUsers();
    let users = {};
    try {
      users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
    } catch {
      users = {};
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = users[normalizedEmail];

    if (!user) {
      throw new Error('User not found. Please register or check your email.');
    }

    const inputHash = await sha256Hex(password);
    if (user.passwordHash !== inputHash) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    return this._saveSession(user);
  }

  async signInWithGoogle() {
    const googleUser = {
      uid: 'google_scholar_2026',
      email: 'quantum.scholar@gmail.com',
      displayName: 'Quantum Scholar',
      role: 'student',
      academicRole: 'undergraduate',
      level: 'intermediate',
      densityMode: 'compact',
      college: 'VTU Faculty of Engineering',
      onboarded: true,
      createdAt: Date.now()
    };

    // Store in users registry if not present
    let users = {};
    try {
      users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
    } catch {
      users = {};
    }
    if (!users[googleUser.email]) {
      users[googleUser.email] = {
        ...googleUser,
        passwordHash: 'google_oauth_verified'
      };
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    return this._saveSession(googleUser);
  }

  continueAsGuest() {
    const guestUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: 'guest@quantech.local',
      displayName: 'Guest Explorer',
      role: 'student',
      academicRole: 'curious_learner',
      level: 'beginner',
      densityMode: 'comfortable',
      isGuest: true,
      onboarded: true,
      createdAt: Date.now()
    };

    return this._saveSession(guestUser);
  }

  async updateProfile(updates) {
    if (!this._currentUser) {
      throw new Error('No user is currently authenticated.');
    }

    const updatedUser = {
      ...this._currentUser,
      ...updates
    };
    delete updatedUser.passwordHash;

    // Update in users database if registered user
    if (!this._currentUser.isGuest && this._currentUser.email) {
      try {
        const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
        const email = this._currentUser.email.toLowerCase();
        if (users[email]) {
          users[email] = {
            ...users[email],
            ...updates
          };
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      } catch (e) {
        console.warn('Failed to update user in database:', e);
      }
    }

    return this._saveSession(updatedUser);
  }

  async sendPasswordReset(email) {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    await this._initSeedUsers();
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
    const normalized = email.trim().toLowerCase();
    if (!users[normalized]) {
      throw new Error('No account found associated with that email address.');
    }
    return {
      success: true,
      message: `Password reset instructions sent to ${normalized}.`
    };
  }

  signOut() {
    this._currentUser = null;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(USER_PERSIST_KEY);
      }
    } catch (e) {
      console.warn('Error clearing session storage:', e);
    }
    this._notifyListeners();
  }
}

export const authService = new AuthService();
