import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Wrench,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  Play,
  Clock,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import apiClient from '../api/client';
import JourneyBar from '../components/JourneyBar';
import { getStoredProgress, calculateTopicProgress } from '../utils/progress';

export default function Home({ onOpenTutor }) {
  const [topics, setTopics] = useState([]);
  const [activeTopicData, setActiveTopicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCurriculum() {
      try {
        setLoading(true);
        const data = await apiClient.getTopics();
        setTopics(data);

        if (data.length > 0) {
          const stored = getStoredProgress();
          const active = data.find(t => {
            const prog = stored.topics[t.id];
            return prog && !prog.isCompleted;
          }) || data.find(t => t.status === 'ready') || data[0];

          if (active) {
            try {
              const fullTopic = await apiClient.getTopic(active.id);
              setActiveTopicData(fullTopic);
            } catch (e) {
              console.warn('Could not fetch active topic data on initial load:', e);
            }
          }
        }
      } catch (err) {
        setError('Could not connect to the quantum backend. Please ensure the backend is running with start-dev.bat.');
      } finally {
        setLoading(false);
      }
    }
    loadCurriculum();
  }, []);

  const progress = getStoredProgress();

  // Find active topic (first in-progress, or first ready topic)
  let activeTopic = null;
  if (topics.length > 0) {
    activeTopic = topics.find(t => {
      const prog = progress.topics[t.id];
      return prog && !prog.isCompleted;
    }) || topics.find(t => t.status === 'ready') || topics[0];
  }

  // Fetch full active topic data if activeTopic changes
  useEffect(() => {
    if (!activeTopic?.id) return;
    let isCurrent = true;
    apiClient.getTopic(activeTopic.id)
      .then(data => {
        if (isCurrent) setActiveTopicData(data);
      })
      .catch(err => {
        console.warn('Could not load active topic details for dashboard:', err);
      });
    return () => { isCurrent = false; };
  }, [activeTopic?.id]);

  // Calculate weak concept title from answeredAssessments if any wrong answers exist
  let weakConceptTitle = null;
  const answeredAssessments = {};

  // 1. Gather answeredAssessments from stored topic progress
  const activeProgData = activeTopic ? progress.topics[activeTopic.id] : null;
  if (activeProgData?.answeredAssessments) {
    Object.assign(answeredAssessments, activeProgData.answeredAssessments);
  }

  // 2. Also check direct answeredAssessments in localStorage
  try {
    const rawDirect = localStorage.getItem('answeredAssessments');
    if (rawDirect) {
      const parsed = JSON.parse(rawDirect);
      if (parsed && typeof parsed === 'object') {
        if (activeTopic && parsed[activeTopic.id] && typeof parsed[activeTopic.id] === 'object') {
          Object.assign(answeredAssessments, parsed[activeTopic.id]);
        } else {
          Object.assign(answeredAssessments, parsed);
        }
      }
    }
  } catch (e) {}

  // Find questions with wrong answers (false)
  const wrongIds = Object.keys(answeredAssessments).filter(qId => answeredAssessments[qId] === false);

  if (wrongIds.length > 0 && activeTopicData) {
    const allQuestions = [
      ...(activeTopicData.assessments || []),
      ...(activeTopicData.quick_checks || [])
    ];
    const allConcepts = activeTopicData.concepts || [];

    for (const qId of wrongIds) {
      const matchedQ = allQuestions.find(q =>
        q.id === qId ||
        qId.endsWith(q.id) ||
        q.id.endsWith(qId) ||
        (qId.startsWith('QC_') && q.id === qId.replace('QC_', ''))
      );

      if (matchedQ) {
        let links = matchedQ.conceptLinks || matchedQ.concept_links || (matchedQ.concept_id ? [matchedQ.concept_id] : (matchedQ.key_concept ? [matchedQ.key_concept] : []));
        if (typeof links === 'string') links = [links];
        if (Array.isArray(links) && links.length > 0) {
          const linkItem = links[0];
          const linkId = (typeof linkItem === 'object' && linkItem !== null) ? (linkItem.id || linkItem.concept_id || linkItem.title) : linkItem;
          const found = allConcepts.find(c => c.id === linkId || c.title?.toLowerCase() === String(linkId).toLowerCase());
          if (found?.title) {
            weakConceptTitle = found.title;
            break;
          }
          if (typeof linkId === 'string' && linkId.trim()) {
            weakConceptTitle = linkId;
            break;
          }
        }
      }
    }

    // Fallback if specific ID matching missed but wrong answers exist
    if (!weakConceptTitle && allQuestions.length > 0) {
      for (const q of allQuestions) {
        let links = q.conceptLinks || q.concept_links || (q.concept_id ? [q.concept_id] : []);
        if (typeof links === 'string') links = [links];
        if (Array.isArray(links) && links.length > 0) {
          const linkItem = links[0];
          const linkId = (typeof linkItem === 'object' && linkItem !== null) ? (linkItem.id || linkItem.concept_id || linkItem.title) : linkItem;
          const found = allConcepts.find(c => c.id === linkId || c.title?.toLowerCase() === String(linkId).toLowerCase());
          if (found?.title) {
            weakConceptTitle = found.title;
            break;
          }
        }
      }
    }
  }

  // Calculate real progress for active topic dynamically from loaded manifest/data
  const activeConceptsCount = activeTopicData?.concepts?.length || activeTopic?.concepts_count || 0;
  const activeAssessmentsCount = (activeTopicData?.assessments?.length || 0) + (activeTopicData?.quick_checks?.length || 0) || activeTopic?.assessments_count || 0;

  const activeProg = activeTopic
    ? calculateTopicProgress(activeTopic.id, activeConceptsCount, activeAssessmentsCount, activeTopic.completion_threshold || 0.75)
    : { percentage: 0, conceptsViewed: 0, totalConcepts: 0, assessmentsCorrect: 0, totalAssessments: 0 };

  // Calculate real global module stats dynamically across loaded topics
  const totalConceptsModule = topics.length > 0
    ? topics.reduce((sum, t) => sum + (t.concepts_count || (t.concepts ? t.concepts.length : 0)), 0)
    : 0;

  const totalExploredConcepts = topics.reduce((sum, t) => {
    const tProg = progress.topics[t.id];
    const viewed = tProg?.viewedConcepts || [];
    const maxCount = t.concepts_count || (t.concepts ? t.concepts.length : 0);
    return sum + (maxCount > 0 ? Math.min(viewed.length, maxCount) : viewed.length);
  }, 0);

  const totalAssessmentsCorrect = topics.reduce((sum, t) => {
    const tProg = progress.topics[t.id];
    const answered = tProg?.answeredAssessments || {};
    return sum + Object.values(answered).filter(Boolean).length;
  }, 0);

  const foundationPercentage = totalConceptsModule > 0
    ? Math.min(100, Math.round((totalExploredConcepts / totalConceptsModule) * 100))
    : 0;
  const hasStartedLearning = totalExploredConcepts > 0 || progress.circuitsRunCount > 0;

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#4A5168] font-medium">Loading quantum curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Top Persistent Journey Bar */}
      <JourneyBar
        currentStage="learn"
        completedStages={activeProg.isCompleted ? ['learn', 'ask', 'build', 'run', 'understand', 'practice'] : []}
        onOpenTutor={onOpenTutor}
        topicId={activeTopic?.id}
      />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Offline / Connection Notice Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-[#FFF4DB] border border-[#F59E0B]/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[#1F2433] animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2 max-w-xl">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* 1. Welcoming Learning Header & Compact Progress Dashboard */}
        <section className="space-y-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FF] text-[#4F46E5] text-xs font-semibold border border-[#4F46E5]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Your Learning Dashboard</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1F2433] tracking-tight">
              Welcome to Quantum Computing
            </h1>

            <p className="text-sm sm:text-base text-[#4A5168] max-w-2xl leading-relaxed">
              Explore qubits, superposition, and entanglement step-by-step with verified mathematics, an interactive simulator, and honest AI guidance.
            </p>
          </div>

          {/* Compact Progress Area: YOUR QUANTUM JOURNEY */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] bg-[#EEF0FF] px-2 py-0.5 rounded-full border border-[#4F46E5]/20">
                  Your Quantum Journey
                </span>
                <h2 className="font-heading text-lg font-bold text-[#1F2433]">
                  Module 1: Quantum Computing Fundamentals
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#717A8C]">
                <span className="font-medium">
                  <span className="font-mono font-bold text-[#1F2433]">{totalExploredConcepts}</span> / {totalConceptsModule} concepts explored
                </span>
                {progress.circuitsRunCount > 0 && (
                  <span className="hidden sm:inline border-l border-[#ECE8E1] pl-3">
                    <span className="font-mono font-bold text-[#0E9F9B]">{progress.circuitsRunCount}</span> circuits simulated
                  </span>
                )}
                {totalAssessmentsCorrect > 0 && (
                  <span className="hidden sm:inline border-l border-[#ECE8E1] pl-3">
                    <span className="font-mono font-bold text-[#16A34A]">{totalAssessmentsCorrect}</span> checks mastered
                  </span>
                )}
              </div>
            </div>

              {/* Global Exploration Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2.5 rounded-full bg-[#FBFAF7] border border-[#ECE8E1] overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(totalExploredConcepts > 0 ? 8 : 2, foundationPercentage))}%` }}
                    className="h-full bg-[#4F46E5] rounded-full transition-all duration-500"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#717A8C]">
                  <span>Foundation Progress</span>
                  <span className="font-mono font-bold text-[#1F2433]">
                    {foundationPercentage}%
                  </span>
                </div>
              </div>
          </div>
        </section>

        {/* 2. Three Distinct Core Cards: CONTINUE LEARNING, RECOMMENDED ACTIVITY, ASK YOUR TUTOR */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card A: CONTINUE LEARNING */}
          <div className="p-5 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#4F46E5]/40 transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Continue Learning</span>
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FBFAF7] text-[#717A8C] border border-[#ECE8E1]">
                  {activeTopic ? `Topic ${activeTopic.id}` : 'Curriculum Topic'}
                </span>
              </div>

              <div>
                <h3 className="font-heading text-base font-bold text-[#1F2433] group-hover:text-[#4F46E5] transition-colors">
                  {activeTopic?.title || 'Quantum Foundations'}
                </h3>
                <p className="mt-1 text-xs text-[#717A8C] line-clamp-2 leading-relaxed">
                  {activeTopic?.summary || 'Discover qubits, superposition, and entanglement without hype.'}
                </p>
              </div>

              {/* Topic exploration indicator */}
              <div className="pt-1 space-y-1">
                <div className="flex justify-between text-[11px] text-[#717A8C]">
                  <span>Topic Progress</span>
                  <span className="font-mono font-bold text-[#1F2433]">{activeProg.percentage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#FBFAF7] border border-[#ECE8E1] overflow-hidden">
                  <div
                    style={{ width: `${Math.max(activeProg.percentage, 5)}%` }}
                    className="h-full bg-[#4F46E5] rounded-full transition-all duration-300"
                  />
                </div>
              </div>

              {/* Review Suggested Banner */}
              {weakConceptTitle && (
                <div className="p-3 rounded-xl bg-[#FFF8EB] border border-[#F59E0B]/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#B45309]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                    <span>Review Suggested</span>
                  </div>
                  <p className="text-[11px] text-[#92400E] leading-relaxed">
                    You got some questions wrong in this topic — review <span className="font-semibold">{weakConceptTitle}</span> before moving on.
                  </p>
                </div>
              )}
            </div>

            <Link
              to={activeTopic ? `/learn?topic=${encodeURIComponent(activeTopic.id)}` : '/learn'}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>{hasStartedLearning ? 'Continue Lesson' : 'Start First Lesson'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card B: RECOMMENDED ACTIVITY (Quantum Lab Simulator) */}
          <div className="p-5 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#0E9F9B]/40 transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E9F9B] flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Recommended Activity</span>
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F6F5] text-[#0E9F9B] border border-[#0E9F9B]/20">
                  Simulator
                </span>
              </div>

              <div>
                <h3 className="font-heading text-base font-bold text-[#1F2433] group-hover:text-[#0E9F9B] transition-colors">
                  Build the Bell State
                </h3>
                <p className="mt-1 text-xs text-[#717A8C] line-clamp-2 leading-relaxed">
                  Place Hadamard and CNOT gates to create genuine 2-qubit entanglement and inspect real-time statevector probabilities.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] text-[11px] text-[#717A8C] flex items-center gap-1.5">
                <Play className="w-3 h-3 text-[#0E9F9B] shrink-0" />
                <span>Preload H(q0) + CNOT(q0, q1)</span>
              </div>
            </div>

            <Link
              to="/lab"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0E9F9B] hover:bg-[#0B7A77] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>Open Quantum Lab</span>
              <Wrench className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card C: ASK YOUR TUTOR */}
          <div className="p-5 rounded-2xl bg-white border border-[#ECE8E1] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#7C3AED]/40 transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Your Tutor</span>
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] border border-[#7C3AED]/20">
                  AI Grounded
                </span>
              </div>

              <div>
                <h3 className="font-heading text-base font-bold text-[#1F2433] group-hover:text-[#7C3AED] transition-colors">
                  AI Q-Tutor Available
                </h3>
                <p className="mt-1 text-xs text-[#717A8C] leading-relaxed">
                  Clarify doubts on qubits, superposition, or circuit math without ever navigating away from your learning context.
                </p>
              </div>

              {/* Quick Prompt Pill */}
              <button
                type="button"
                onClick={() => onOpenTutor && onOpenTutor({
                  topicId: activeTopic?.id,
                  topicTitle: activeTopic?.title,
                  initialQuestion: "Can you explain quantum superposition in simple terms?"
                })}
                className="w-full text-left p-2 rounded-xl bg-[#FBFAF7] hover:bg-[#F3E8FF]/50 border border-[#ECE8E1] text-[11px] text-[#7C3AED] font-medium transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>"Explain superposition simply"</span>
                <ChevronRight className="w-3 h-3 text-[#7C3AED]" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenTutor && onOpenTutor({
                topicId: activeTopic?.id,
                topicTitle: activeTopic?.title
              })}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>Ask AI Tutor</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* 4. Dynamic Learning Path (Rendered Strictly from API) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-[#1F2433]">
                Curriculum Learning Path
              </h2>
              <p className="text-xs text-[#4A5168]">
                Topics discovered dynamically from the validated content packs.
              </p>
            </div>
            <span className="font-mono text-xs text-[#4A5168] bg-white px-2.5 py-1 rounded-lg border border-[#ECE8E1]">
              {topics.length} {topics.length === 1 ? 'Topic Active' : 'Topics Loaded'}
            </span>
          </div>

          <div className="space-y-3">
            {topics.map((topic, idx) => {
              const topicProg = progress.topics[topic.id];
              const isCompleted = topicProg?.isCompleted;
              const hasActivity = topicProg && (topicProg.viewedConcepts?.length > 0);
              const isLocked = topic.status === 'locked';
              const isComingSoon = topic.status === 'coming_soon';

              return (
                <div
                  key={topic.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCompleted
                      ? 'bg-white border-[#16A34A]/30 shadow-2xs'
                      : topic.id === activeTopic?.id
                      ? 'bg-white border-[#4F46E5] shadow-xs'
                      : 'bg-white border-[#ECE8E1]'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Status Circle Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-[#E4F6EA] text-[#16A34A]'
                          : topic.id === activeTopic?.id
                          ? 'bg-[#EEF0FF] text-[#4F46E5]'
                          : isLocked
                          ? 'bg-[#FBFAF7] text-[#4A5168]'
                          : 'bg-[#FBFAF7] text-[#1F2433]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <span className="font-heading font-extrabold text-xs">{idx + 1}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#4A5168]">
                          Topic {topic.id}
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E4F6EA] text-[#16A34A]">
                            Completed
                          </span>
                        )}
                        {hasActivity && !isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF0FF] text-[#4F46E5]">
                            In Progress
                          </span>
                        )}
                        {isComingSoon && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF4DB] text-[#F59E0B]">
                            Coming Soon
                          </span>
                        )}
                      </div>

                      <h3 className="font-heading text-base font-bold text-[#1F2433]">
                        {topic.title}
                      </h3>

                      <p className="text-xs text-[#4A5168] line-clamp-1 max-w-xl">
                        {topic.summary}
                      </p>

                      {topic.id === activeTopic?.id && weakConceptTitle && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8EB] border border-[#F59E0B]/30 text-xs text-[#92400E]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                          <span>
                            You got some questions wrong in this topic — review <strong className="font-semibold">{weakConceptTitle}</strong> before moving on.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Estimated time + Action Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#ECE8E1]">
                    <div className="flex items-center gap-1.5 text-xs text-[#4A5168]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{topic.estimated_minutes} min</span>
                    </div>

                    <Link
                      to={`/learn?topic=${encodeURIComponent(topic.id)}`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        topic.id === activeTopic?.id
                          ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                          : 'bg-[#FBFAF7] text-[#1F2433] hover:bg-[#EEF0FF] hover:text-[#4F46E5] border border-[#ECE8E1]'
                      }`}
                    >
                      <span>{isCompleted ? 'Review' : 'Open Lesson'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Six-Stage Journey Explanation */}
        <section className="p-6 rounded-2xl bg-white border border-[#ECE8E1] space-y-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#1F2433]">
              The Six-Stage Learning Journey
            </h2>
            <p className="text-xs text-[#4A5168]">
              How every quantum concept is explored in QuantaLearn AI.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { stage: 'Learn', color: '#4F46E5', desc: 'Read plain-language intuition with visual models.' },
              { stage: 'Ask', color: '#7C3AED', desc: 'Clarify doubts with grounded AI Tutor.' },
              { stage: 'Build', color: '#0E9F9B', desc: 'Place gates on quantum register wires.' },
              { stage: 'Run', color: '#F59E0B', desc: 'Execute statevector simulation.' },
              { stage: 'Understand', color: '#16A34A', desc: 'Inspect verified telemetry and mathematics.' },
              { stage: 'Practice', color: '#F2705A', desc: 'Solidify your mental model with quick checks.' }
            ].map((item, i) => (
              <div
                key={item.stage}
                className="p-3 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-1"
              >
                <div
                  className="font-heading font-extrabold text-xs"
                  style={{ color: item.color }}
                >
                  {i + 1}. {item.stage}
                </div>
                <p className="text-[11px] text-[#4A5168] leading-tight">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
