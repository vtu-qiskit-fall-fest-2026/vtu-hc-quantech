/**
 * QuantumLearnAI — Real Progress Tracking.
 * Keyed dynamically by topic ID, stored in localStorage.
 * No hardcoded values.
 */

const STORAGE_KEY = 'quantumlearn_user_progress_v2';

export function getStoredProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { topics: {}, circuitsRunCount: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { topics: {}, circuitsRunCount: 0 };
    return {
      topics: parsed.topics || {},
      circuitsRunCount: parsed.circuitsRunCount || 0
    };
  } catch (e) {
    console.warn('Failed to parse progress storage, resetting safely:', e);
    return { topics: {}, circuitsRunCount: 0 };
  }
}

export function saveStoredProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save progress to localStorage:', e);
  }
}

export function markConceptViewed(topicId, conceptId) {
  const progress = getStoredProgress();
  if (!progress.topics[topicId]) {
    progress.topics[topicId] = {
      viewedConcepts: [],
      answeredAssessments: {},
      lastUpdated: Date.now()
    };
  }
  const viewed = new Set(progress.topics[topicId].viewedConcepts || []);
  viewed.add(conceptId);
  progress.topics[topicId].viewedConcepts = Array.from(viewed);
  progress.topics[topicId].lastUpdated = Date.now();
  saveStoredProgress(progress);
}

export function recordAssessmentAnswer(topicId, questionId, isCorrect) {
  const progress = getStoredProgress();
  if (!progress.topics[topicId]) {
    progress.topics[topicId] = {
      viewedConcepts: [],
      answeredAssessments: {},
      lastUpdated: Date.now()
    };
  }
  if (!progress.topics[topicId].answeredAssessments) {
    progress.topics[topicId].answeredAssessments = {};
  }
  progress.topics[topicId].answeredAssessments[questionId] = isCorrect;
  progress.topics[topicId].lastUpdated = Date.now();
  saveStoredProgress(progress);
}

export function incrementCircuitRun() {
  const progress = getStoredProgress();
  progress.circuitsRunCount = (progress.circuitsRunCount || 0) + 1;
  saveStoredProgress(progress);
}

export function calculateTopicProgress(topicId, totalConceptsCount = 0, totalAssessmentsCount = 0, threshold = 0.75) {
  const progress = getStoredProgress();
  const tData = progress.topics[topicId];
  if (!tData) {
    return {
      percentage: 0,
      conceptsViewed: 0,
      totalConcepts: totalConceptsCount,
      assessmentsCorrect: 0,
      totalAssessments: totalAssessmentsCount,
      isCompleted: false
    };
  }

  const viewedCount = (tData.viewedConcepts || []).length;
  const answered = tData.answeredAssessments || {};
  const correctCount = Object.values(answered).filter(Boolean).length;

  let conceptWeight = 0.6;
  let quizWeight = 0.4;

  if (totalAssessmentsCount === 0 && totalConceptsCount > 0) {
    conceptWeight = 1.0;
    quizWeight = 0.0;
  }

  const conceptPct = totalConceptsCount > 0 ? Math.min(1.0, viewedCount / totalConceptsCount) : 0;
  const quizPct = totalAssessmentsCount > 0 ? Math.min(1.0, correctCount / totalAssessmentsCount) : 0;

  const totalFraction = (conceptPct * conceptWeight) + (quizPct * quizWeight);
  const percentage = Math.round(totalFraction * 100);

  const isCompleted = conceptPct >= 0.99 && (totalAssessmentsCount === 0 || quizPct >= threshold);

  return {
    percentage,
    conceptsViewed: viewedCount,
    totalConcepts: totalConceptsCount,
    assessmentsCorrect: correctCount,
    totalAssessments: totalAssessmentsCount,
    isCompleted
  };
}

export function recordQuizAttempt(topicId, questionId, selectedOption, isCorrect, conceptId = null) {
  const progress = getStoredProgress();
  if (!progress.topics[topicId]) {
    progress.topics[topicId] = {
      viewedConcepts: [],
      answeredAssessments: {},
      quizHistory: [],
      lastUpdated: Date.now()
    };
  }
  if (!progress.topics[topicId].answeredAssessments) {
    progress.topics[topicId].answeredAssessments = {};
  }
  if (!progress.topics[topicId].quizHistory) {
    progress.topics[topicId].quizHistory = [];
  }
  
  progress.topics[topicId].answeredAssessments[questionId] = isCorrect;
  progress.topics[topicId].quizHistory.push({
    questionId,
    selectedOption,
    isCorrect,
    conceptId,
    timestamp: Date.now()
  });
  progress.topics[topicId].lastUpdated = Date.now();
  saveStoredProgress(progress);
}

export function getStudentLearningState() {
  const progress = getStoredProgress();
  const topics = progress.topics || {};

  const visitedTopics = [];
  const completedTopics = [];
  const quizHistory = [];
  const weakConceptsSet = new Set();
  const mastery = {};

  for (const [topicId, data] of Object.entries(topics)) {
    if (data.viewedConcepts && data.viewedConcepts.length > 0) {
      visitedTopics.push(topicId);
    }
    const answered = data.answeredAssessments || {};
    const totalAnswered = Object.keys(answered).length;
    const correctCount = Object.values(answered).filter(Boolean).length;
    const viewedCount = (data.viewedConcepts || []).length;

    // Record weak concepts
    for (const [qId, isCorrect] of Object.entries(answered)) {
      if (!isCorrect) {
        weakConceptsSet.add(`${topicId}:${qId}`);
      }
    }

    if (data.quizHistory && Array.isArray(data.quizHistory)) {
      quizHistory.push(...data.quizHistory.map(h => ({ ...h, topicId })));
    }

    // Determine mastery % for topic
    if (viewedCount > 0 || totalAnswered > 0) {
      const scoreFraction = totalAnswered > 0 ? (correctCount / totalAnswered) : 0;
      mastery[topicId] = Math.round(scoreFraction * 100);
      if (viewedCount >= 4 && scoreFraction >= 0.75) {
        completedTopics.push(topicId);
      }
    }
  }

  return {
    visitedTopics,
    completedTopics,
    quizHistory,
    weakConcepts: Array.from(weakConceptsSet),
    mastery,
    circuitsRunCount: progress.circuitsRunCount || 0
  };
}
