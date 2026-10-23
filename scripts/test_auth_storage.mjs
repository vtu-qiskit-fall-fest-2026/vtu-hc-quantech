/**
 * QuantaLearn AI — Auth & Storage Verification Test Script
 */

// Mock browser environments for testing services in Node.js
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockStorage();
globalThis.sessionStorage = new MockStorage();
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { authService } from '../src/services/authService.js';
import { storageService } from '../src/services/storageService.js';

async function runTests() {
  console.log('======================================================');
  console.log('  QuantaLearn AI — Auth & Storage Unit Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Sign up with invalid password
    console.log('[Test 1] Input Validation (Password length)');
    try {
      await authService.signUpWithEmail('short@test.com', '123');
      assert(false, 'Should have rejected password < 6 chars');
    } catch (e) {
      assert(e.message.includes('at least 6 characters'), 'Rejects passwords under 6 characters');
    }

    // Test 2: Successful Sign Up
    console.log('\n[Test 2] Student Registration');
    const newUser = await authService.signUpWithEmail('student_test@university.edu', 'quantumSecure2026', {
      displayName: 'Quantum Learner',
      college: 'Test University',
      role: 'student'
    });
    assert(newUser.email === 'student_test@university.edu', 'User created with correct email');
    assert(newUser.role === 'student', 'Assigned student role');
    assert(!newUser.passwordHash, 'Password hash is stripped from public session');

    // Test 3: Password not stored in plaintext
    console.log('\n[Test 3] Password Security (No plaintext)');
    const rawUsers = JSON.parse(localStorage.getItem('quantalearn_auth_users'));
    const userInDb = rawUsers['student_test@university.edu'];
    assert(userInDb && userInDb.passwordHash !== 'quantumSecure2026', 'Password is not stored in plaintext');
    assert(userInDb.passwordHash.length === 64, 'Password hashed with SHA-256 (64 hex characters)');

    // Test 4: Sign out
    console.log('\n[Test 4] Sign Out & Session Teardown');
    authService.signOut();
    assert(authService.currentUser === null, 'Current user cleared on sign out');
    assert(sessionStorage.getItem('quantalearn_auth_session') === null, 'SessionStorage token purged');

    // Test 5: Sign In with correct credentials
    console.log('\n[Test 5] Sign In Authentication');
    const loggedUser = await authService.signInWithEmail('student_test@university.edu', 'quantumSecure2026');
    assert(loggedUser.uid === newUser.uid, 'Successfully logged in with valid credentials');

    // Test 6: Sign In with incorrect password
    console.log('\n[Test 6] Wrong Password Rejection');
    try {
      await authService.signInWithEmail('student_test@university.edu', 'wrongPassword!');
      assert(false, 'Should have failed on incorrect password');
    } catch (e) {
      assert(e.message.includes('Incorrect password'), 'Rejects incorrect password');
    }

    // Test 7: Google OAuth Flow
    console.log('\n[Test 7] Google Sign-In Flow');
    const googleUser = await authService.signInWithGoogle();
    assert(googleUser.email === 'quantum.scholar@gmail.com', 'Google sign-in profile loaded');

    // Test 8: Offline Guest Session
    console.log('\n[Test 8] Offline-First Guest Mode');
    const guest = authService.continueAsGuest();
    assert(guest.isGuest === true, 'Guest session flagged as isGuest');
    assert(guest.uid.startsWith('guest_'), 'Guest assigned unique temporary ID');

    // Test 9: Storage Service Namespacing & Guest Merging
    console.log('\n[Test 9] Per-User Storage & Progress Merging');
    // Save some progress as guest
    storageService.saveUserData(guest.uid, {
      courseProgress: {
        lessons: {
          'M1.L1': { completed: true, score: 90, stages: { theory: true, lab: true, quiz: true, practical_exam: true } }
        },
        lastActiveLesson: 'M1.L2'
      },
      savedCircuits: [{ name: 'Guest Bell State', gates: 2 }]
    });

    // Merge into registered student account
    storageService.mergeGuestData(guest.uid, newUser.uid);
    const mergedUserProgress = storageService.loadUserData(newUser.uid);
    assert(mergedUserProgress.courseProgress.lessons['M1.L1']?.completed === true, 'Guest lesson completion merged into account');
    assert(mergedUserProgress.courseProgress.lessons['M1.L1']?.score === 90, 'Guest score retained');
    assert(mergedUserProgress.savedCircuits.length === 1, 'Guest saved circuits merged into account');

    console.log('\n======================================================');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('======================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
