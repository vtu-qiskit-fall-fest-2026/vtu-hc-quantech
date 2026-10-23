/**
 * QuantaLearn AI — Part 1: Levels & Onboarding Verification Test Script
 */

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

import {
  PLACEMENT_QUESTIONS,
  calculatePlacementLevel,
  LEVEL_DEFINITIONS,
  ROLE_OPTIONS,
  MATH_BACKGROUND_OPTIONS,
  QUANTUM_BACKGROUND_OPTIONS
} from '../src/quantum/placementQuiz.js';
import { authService } from '../src/services/authService.js';
import { storageService } from '../src/services/storageService.js';

async function runPart1Tests() {
  console.log('================================================================');
  console.log('  QuantaLearn AI — Part 1: Levels & Onboarding Test Suite');
  console.log('================================================================\n');

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

  // 1. Placement questions integrity
  console.log('[Suite 1] Placement Questions & Metadata');
  assert(PLACEMENT_QUESTIONS.length === 8, '8 questions configured for placement assessment');
  PLACEMENT_QUESTIONS.forEach((q, idx) => {
    assert(q.options.length === 4, `Q${idx + 1} (${q.id}) has 4 options`);
    const correctOpts = q.options.filter(o => o.correct);
    assert(correctOpts.length === 1, `Q${idx + 1} (${q.id}) has exactly 1 correct answer`);
    assert(Boolean(q.explanation), `Q${idx + 1} (${q.id}) has detailed explanation`);
  });

  // 2. Roles, Math, and Quantum Options
  console.log('\n[Suite 2] Role and Background Options');
  assert(ROLE_OPTIONS.length === 7, '7 explicit academic/professional roles provided');
  assert(ROLE_OPTIONS.some(r => r.id === 'school_student'), 'Contains School Student');
  assert(ROLE_OPTIONS.some(r => r.id === 'undergraduate'), 'Contains Undergraduate');
  assert(ROLE_OPTIONS.some(r => r.id === 'postgraduate'), 'Contains Postgraduate');
  assert(ROLE_OPTIONS.some(r => r.id === 'phd_researcher'), 'Contains PhD / Researcher');
  assert(ROLE_OPTIONS.some(r => r.id === 'faculty'), 'Contains Faculty / Professor');
  assert(ROLE_OPTIONS.some(r => r.id === 'industry_engineer'), 'Contains Industry Engineer');
  assert(ROLE_OPTIONS.some(r => r.id === 'other_professional'), 'Contains Other Professional');

  assert(MATH_BACKGROUND_OPTIONS.length === 4, '4 mathematical background tiers');
  assert(QUANTUM_BACKGROUND_OPTIONS.length === 5, '5 prior quantum knowledge tiers');

  // 3. Adaptive Placement Engine Evaluation
  console.log('\n[Suite 3] Adaptive Placement Engine & Level Recommendations');
  
  // Case A: Novice high-school student with 0/8 correct
  const beginnerResult = calculatePlacementLevel({
    role: 'school_student',
    mathBackground: 'foundational',
    quantumBackground: 'none',
    quizAnswers: {},
  });
  assert(beginnerResult.level === 'beginner', 'Low score & school student maps to beginner');
  assert(beginnerResult.densityMode === 'comfortable', 'Beginner gets comfortable density');

  // Case B: Undergraduate with 4/8 correct
  const intermediateAnswers = {};
  PLACEMENT_QUESTIONS.slice(0, 4).forEach(q => {
    const correct = q.options.find(o => o.correct);
    intermediateAnswers[q.id] = correct.id;
  });
  const intermediateResult = calculatePlacementLevel({
    role: 'undergraduate',
    mathBackground: 'linear_algebra',
    quantumBackground: 'introductory',
    quizAnswers: intermediateAnswers,
  });
  assert(intermediateResult.level === 'intermediate', '4/8 correct with undergrad linear algebra maps to intermediate');
  assert(intermediateResult.densityMode === 'compact', 'Intermediate gets compact density');

  // Case C: PhD / Researcher with 8/8 correct
  const masterAnswers = {};
  PLACEMENT_QUESTIONS.forEach(q => {
    const correct = q.options.find(o => o.correct);
    masterAnswers[q.id] = correct.id;
  });
  const masterResult = calculatePlacementLevel({
    role: 'phd_researcher',
    mathBackground: 'advanced_math',
    quantumBackground: 'advanced',
    quizAnswers: masterAnswers,
  });
  assert(masterResult.level === 'master', '8/8 correct with PhD researcher maps to master');
  assert(masterResult.densityMode === 'dense', 'Master gets dense scientific console density');
  assert(masterResult.score === 8, 'Recorded score is 8');

  // 4. Auth & User Profile State Integration
  console.log('\n[Suite 4] Auth & Profile State Integration');
  
  // Pre-seeded Instructor
  const instructor = await authService.signInWithEmail('instructor@quantalearn.ai', 'admin123');
  assert(instructor.level === 'master', 'Pre-seeded instructor has level: master');
  assert(instructor.densityMode === 'dense', 'Pre-seeded instructor has densityMode: dense');
  assert(instructor.role === 'instructor', 'Pre-seeded instructor has role: instructor');

  // Pre-seeded Student
  const student = await authService.signInWithEmail('student@quantalearn.ai', 'admin123');
  assert(student.level === 'intermediate', 'Pre-seeded student has level: intermediate');
  assert(student.densityMode === 'compact', 'Pre-seeded student has densityMode: compact');

  // Offline Guest session
  authService.signOut();
  const guest = authService.continueAsGuest();
  assert(guest.isGuest === true, 'Guest session is marked as isGuest: true');
  assert(guest.level === 'beginner', 'Guest defaults to level: beginner');
  assert(guest.densityMode === 'comfortable', 'Guest defaults to densityMode: comfortable');

  // New Signup with metadata
  const newEmail = `scholar_${Date.now()}@test.com`;
  const newUser = await authService.signUpWithEmail(newEmail, 'securePass123', {
    displayName: 'Ada Lovelace',
    role: 'student',
    academicRole: 'postgraduate',
    level: 'intermediate',
    densityMode: 'compact',
    mathBackground: 'linear_algebra',
    quantumBackground: 'introductory',
    placementScore: 6,
    onboarded: true,
  });
  assert(newUser.level === 'intermediate', 'Signed up user persists calibrated level');
  assert(newUser.academicRole === 'postgraduate', 'Signed up user persists academicRole');
  assert(newUser.placementScore === 6, 'Signed up user persists placementScore');

  // Override Level in Profile Settings
  const updated = await authService.updateProfile({
    level: 'master',
    densityMode: 'dense',
  });
  assert(updated.level === 'master', 'User can override level to master');
  assert(updated.densityMode === 'dense', 'User can override densityMode to dense');

  // 5. StorageService Preferences Integration
  console.log('\n[Suite 5] StorageService Preferences Integration');
  const uData = storageService.loadUserData(newUser.uid);
  assert(uData.preferences.level !== undefined, 'StorageService loads preferences.level');
  assert(uData.preferences.densityMode !== undefined, 'StorageService loads preferences.densityMode');

  storageService.saveUserData(newUser.uid, {
    ...uData,
    preferences: {
      ...uData.preferences,
      level: 'master',
      densityMode: 'dense',
    }
  });
  const reloaded = storageService.loadUserData(newUser.uid);
  assert(reloaded.preferences.level === 'master', 'Saved level reloads correctly from storage');
  assert(reloaded.preferences.densityMode === 'dense', 'Saved densityMode reloads correctly from storage');

  console.log('\n================================================================');
  console.log(`  Tests Passed: ${passed} | Tests Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPart1Tests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
