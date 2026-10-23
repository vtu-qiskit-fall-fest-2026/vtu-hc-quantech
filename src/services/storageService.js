/**
 * QuantaLearn AI — Per-User Storage Service.
 * Manages user preferences, customized progress states, saved quantum circuits,
 * and seamless merging of guest sessions into registered accounts.
 */

const USER_DATA_PREFIX = 'quantalearn_user_data_';

const defaultUserData = {
  preferences: {
    level: 'beginner',
    densityMode: 'comfortable',
    theme: 'system',
    autoRotateBloch: false,
    defaultShots: 1024,
    soundFeedback: true
  },
  courseProgress: {
    lessons: {},
    lastActiveLesson: null,
    totalTimeSpentMinutes: 0
  },
  savedCircuits: []
};

class StorageService {
  _getKey(uid) {
    return `${USER_DATA_PREFIX}${uid}`;
  }

  loadUserData(uid) {
    if (!uid) return JSON.parse(JSON.stringify(defaultUserData));
    try {
      const raw = localStorage.getItem(this._getKey(uid));
      if (!raw) return JSON.parse(JSON.stringify(defaultUserData));
      const parsed = JSON.parse(raw);
      return {
        preferences: {
          ...defaultUserData.preferences,
          ...(parsed.preferences || {})
        },
        courseProgress: {
          ...defaultUserData.courseProgress,
          ...(parsed.courseProgress || {}),
          lessons: {
            ...defaultUserData.courseProgress.lessons,
            ...(parsed.courseProgress?.lessons || {})
          }
        },
        savedCircuits: Array.isArray(parsed.savedCircuits) ? parsed.savedCircuits : []
      };
    } catch (e) {
      console.warn(`Failed to parse user data for ${uid}:`, e);
      return JSON.parse(JSON.stringify(defaultUserData));
    }
  }

  saveUserData(uid, data) {
    if (!uid) return;
    try {
      localStorage.setItem(this._getKey(uid), JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to save user data for ${uid}:`, e);
    }
  }

  mergeGuestData(guestUid, userUid) {
    if (!guestUid || !userUid || guestUid === userUid) return;

    const guestData = this.loadUserData(guestUid);
    const userData = this.loadUserData(userUid);

    // Deep merge lessons
    const mergedLessons = {
      ...(userData.courseProgress?.lessons || {}),
      ...(guestData.courseProgress?.lessons || {})
    };

    // Merge saved circuits (deduplicating by name/structure)
    const existingCircuitNames = new Set(
      (userData.savedCircuits || []).map(c => c.name)
    );
    const additionalCircuits = (guestData.savedCircuits || []).filter(
      c => !existingCircuitNames.has(c.name)
    );

    const mergedData = {
      ...userData,
      preferences: {
        ...guestData.preferences,
        ...userData.preferences
      },
      courseProgress: {
        ...userData.courseProgress,
        lessons: mergedLessons,
        lastActiveLesson:
          userData.courseProgress?.lastActiveLesson ||
          guestData.courseProgress?.lastActiveLesson
      },
      savedCircuits: [
        ...(userData.savedCircuits || []),
        ...additionalCircuits
      ]
    };

    this.saveUserData(userUid, mergedData);

    // Clean up temporary guest key
    try {
      localStorage.removeItem(this._getKey(guestUid));
    } catch (e) {
      console.warn('Failed to clean up guest key after merge:', e);
    }

    return mergedData;
  }
}

export const storageService = new StorageService();
