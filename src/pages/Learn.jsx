import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import {
  Wrench,
  Sparkles,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Target,
  AlertTriangle,
  Award
} from 'lucide-react';
import apiClient from '../api/client';
import JourneyBar from '../components/JourneyBar';
import LessonBlock from '../components/LessonBlock';
import ComparisonTable from '../components/ComparisonTable';
import ConceptPractice from '../components/ConceptPractice';
import { markConceptViewed, getStoredProgress, calculateTopicProgress } from '../utils/progress';
import { useLearning } from '../context/LearningContext';

/**
 * Learn page — paginated lesson: exactly ONE concept per page.
 * URL shape: /learn?topic=1.1&concept=C03 or /learn/1.1/C03 (deep-linkable, browser back/forward works).
 * Each page = concept lesson + practice questions linked to that concept + Prev/Next.
 */
export default function Learn({ onOpenTutor }) {
  const learningCtx = useLearning();

  const setTopicContext = learningCtx?.setTopicContext;
  const setConceptContext = learningCtx?.setConceptContext;
  const setVisibleVisualContext = learningCtx?.setVisibleVisualContext;

  const navigate = useNavigate();
  const { topicId: routeTopicId, conceptId: routeConceptId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopicId = routeTopicId || searchParams.get('topic');
  const requestedConceptId = routeConceptId || searchParams.get('concept');

  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showObjectives, setShowObjectives] = useState(false);
  const [, setProgressVersion] = useState(0); // re-render after progress writes

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    async function loadCurriculum() {
      try {
        setLoading(true);
        setError(null);
        const manifestList = await apiClient.getTopics();
        setTopics(manifestList);

        let activeId = requestedTopicId;
        if (!activeId && manifestList.length > 0) {
          activeId = manifestList[0].id;
        }

        if (!activeId) {
          setError('No curriculum topics found.');
          return;
        }

        const activeManifest = manifestList.find(m => m.id === activeId) || manifestList[0];
        setCurrentTopic(activeManifest);

        // Fetch full topic learner view
        const data = await apiClient.getTopic(activeId);
        setTopicData(data);
      } catch (err) {
        setError(`Failed to load topic lesson: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }
    loadCurriculum();
  }, [requestedTopicId]);

  const concepts = topicData?.concepts || [];
  const foundIndex = concepts.findIndex(c => c.id === requestedConceptId);
  const activeIndex = foundIndex >= 0 ? foundIndex : 0;
  const activeConcept = concepts[activeIndex] || null;
  const isFirst = activeIndex === 0;
  const isLast = concepts.length > 0 && activeIndex === concepts.length - 1;
  const topicId = topicData?.manifest?.id || currentTopic?.id;

  // Navigate to a concept page (pushes history so browser Back works)
  const goToConcept = useCallback((index) => {
    if (!topicId || index < 0 || index >= concepts.length) return;
    const targetConcept = concepts[index];
    if (routeTopicId) {
      navigate(`/learn/${topicId}/${targetConcept.id}`);
    } else {
      setSearchParams({ topic: topicId, concept: targetConcept.id });
    }
  }, [topicId, concepts, routeTopicId, navigate, setSearchParams]);

  // Synchronize active topic and concept into global LearningContext
  useEffect(() => {
    if (setTopicContext && topicData?.manifest) {
      setTopicContext({
        topicId: topicData.manifest.id,
        topicTitle: topicData.manifest.title,
        moduleId: topicData.manifest.module_id || 'module-1',
        moduleTitle: topicData.manifest.module_title || 'Quantum Computing Fundamentals'
      });
    }
  }, [topicData, setTopicContext]);

  useEffect(() => {
    if (setConceptContext && activeConcept) {
      setConceptContext({
        conceptId: activeConcept.id,
        conceptTitle: activeConcept.title,
        sectionId: activeConcept.id,
        sectionTitle: activeConcept.title,
        visibleContentId: activeConcept.id,
        visibleContentType: 'concept'
      });
      if (setVisibleVisualContext && (activeConcept.visual_type || activeConcept.circuit_example)) {
        setVisibleVisualContext({
          id: activeConcept.id,
          title: activeConcept.title,
          type: activeConcept.visual_type || 'diagram',
          caption: activeConcept.visual_explanation || activeConcept.title,
          description: activeConcept.visual_explanation || activeConcept.simple_explanation,
          data: activeConcept.circuit_example || activeConcept.visual_data || null
        });
      }
    }
  }, [activeConcept, setConceptContext, setVisibleVisualContext]);

  // When the visible concept changes: mark viewed + scroll to top of the page
  const activeConceptId = activeConcept?.id;
  useEffect(() => {
    if (!activeConceptId || !topicId) return;
    markConceptViewed(topicId, activeConceptId);
    setProgressVersion(v => v + 1);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeConceptId, topicId]);

  // Keyboard navigation: ← / → (ignored while typing in inputs)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') goToConcept(activeIndex + 1);
      if (e.key === 'ArrowLeft') goToConcept(activeIndex - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, goToConcept]);

  const handleOpenTutorForConcept = (concept) => {
    if (onOpenTutor) {
      onOpenTutor({
        topicId,
        topicTitle: topicData?.manifest?.title,
        conceptId: concept.id,
        conceptTitle: concept.title,
        initialQuestion: `Can you explain ${concept.title} simply?`
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <JourneyBar currentStage="learn" onOpenTutor={onOpenTutor} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#4A5168] font-medium">Loading verified lesson...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topicData || !activeConcept) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <JourneyBar currentStage="learn" onOpenTutor={onOpenTutor} />
        <div className="flex-1 p-8 max-w-xl mx-auto">
          <div className="p-6 rounded-2xl bg-[#FFF4DB] border border-[#F59E0B]/30 text-[#1F2433] space-y-3">
            <h2 className="font-heading font-bold text-base text-[#F59E0B]">
              Topic Lesson Unavailable
            </h2>
            <p className="text-xs text-[#4A5168]">{error || 'Topic not found or has no concepts.'}</p>
            <Link
              to="/"
              className="inline-block px-4 py-2 bg-[#F59E0B] text-white rounded-xl text-xs font-bold hover:bg-[#D97706] transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { manifest } = topicData;
  const progress = getStoredProgress();
  const viewedSet = new Set(progress.topics[manifest.id]?.viewedConcepts || []);
  const progInfo = calculateTopicProgress(manifest.id, concepts.length, topicData.assessments?.length || 0);
  const prevConcept = isFirst ? null : concepts[activeIndex - 1];
  const nextConcept = isLast ? null : concepts[activeIndex + 1];

  // Next topic in curriculum order (shown on the final concept page)
  const sortedTopics = [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const topicPos = sortedTopics.findIndex(t => t.id === manifest.id);
  const nextTopic = topicPos >= 0 ? sortedTopics[topicPos + 1] : null;

  return (
    <div ref={scrollContainerRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Top Persistent Journey Bar */}
      <JourneyBar
        currentStage="learn"
        completedStages={progInfo.isCompleted ? ['learn', 'ask', 'build', 'run', 'understand', 'practice'] : []}
        onOpenTutor={() => onOpenTutor && onOpenTutor({
          topicId: manifest.id,
          topicTitle: manifest.title,
          conceptId: activeConcept.id,
          conceptTitle: activeConcept.title
        })}
        topicId={manifest.id}
      />

      <main className="flex-1 max-w-4xl xl:max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Compact Topic Header (every page) */}
        <section className="p-5 sm:p-6 rounded-3xl bg-white border border-[#ECE8E1] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#EEF0FF] text-[#4F46E5] border border-[#4F46E5]/20">
                Topic {manifest.id}
              </span>
              <span className="text-xs text-[#4A5168] flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#4A5168]" /> {manifest.estimated_minutes} min
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="learn-ask-tutor"
                type="button"
                onClick={() => handleOpenTutorForConcept(activeConcept)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#7C3AED] border border-[#7C3AED]/20 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI Tutor</span>
              </button>

              <Link
                to={`/lab?topic=${encodeURIComponent(manifest.id)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E3F6F5] hover:bg-[#CCF0EE] text-[#0E9F9B] border border-[#0E9F9B]/20 text-xs font-bold transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Open Lab</span>
              </Link>
            </div>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1F2433] tracking-tight">
            {manifest.title}
          </h1>

          {/* Segmented step progress: one segment per concept page */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[#4A5168]">
              <span className="font-semibold text-[#1F2433]">
                Concept {activeIndex + 1} of {concepts.length}
              </span>
              <span className="font-mono">{viewedSet.size}/{concepts.length} viewed</span>
            </div>
            <div className="flex gap-1" role="tablist" aria-label="Concept pages">
              {concepts.map((c, idx) => {
                const isCurrent = idx === activeIndex;
                const isRead = viewedSet.has(c.id);
                return (
                  <button
                    key={c.id}
                    id={`concept-step-${c.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    title={`${idx + 1}. ${c.title}`}
                    onClick={() => goToConcept(idx)}
                    className={`group flex-1 h-2.5 rounded-full transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#4F46E5] ring-2 ring-[#4F46E5]/25'
                        : isRead
                        ? 'bg-[#16A34A]/60 hover:bg-[#16A34A]'
                        : 'bg-[#ECE8E1] hover:bg-[#D6D0C4]'
                    }`}
                  >
                    <span className="sr-only">{idx + 1}. {c.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Topic introduction — only on the first concept page */}
        {isFirst && (
          <section className="p-5 sm:p-6 rounded-3xl bg-white border border-[#ECE8E1] shadow-xs space-y-4">
            <p className="text-sm sm:text-base text-[#4A5168] leading-relaxed">{manifest.summary}</p>

            {manifest.prerequisites && manifest.prerequisites.length > 0 && (
              <div className="pt-3 border-t border-[#ECE8E1] flex flex-wrap items-center gap-2 text-xs text-[#4A5168]">
                <span className="font-semibold text-[#1F2433]">Prerequisites:</span>
                <div className="flex flex-wrap gap-1.5">
                  {manifest.prerequisites.map((p, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FBFAF7] text-[#1F2433] border border-[#ECE8E1]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {manifest.time_sensitivity && (
              <div className="p-3 rounded-2xl bg-[#FFF4DB] border border-[#F59E0B]/30 flex items-start gap-2.5 text-xs text-[#1F2433]">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#F59E0B] uppercase tracking-wide text-[10px] mr-1.5">
                    Time-Sensitive Curriculum Note:
                  </span>
                  <span className="text-[#4A5168]">{manifest.time_sensitivity}</span>
                </div>
              </div>
            )}

            {manifest.learning_objectives && manifest.learning_objectives.length > 0 && (
              <div className="rounded-2xl border border-[#ECE8E1] bg-[#FBFAF7] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowObjectives(prev => !prev)}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-[#1F2433] hover:bg-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#4F46E5]" />
                    <span>Learning Objectives ({manifest.learning_objectives.length})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#4A5168]">
                    <span>{showObjectives ? 'Hide' : 'Show goals'}</span>
                    {showObjectives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showObjectives && (
                  <div className="p-4 pt-1 border-t border-[#ECE8E1] bg-white space-y-2">
                    <ul className="space-y-2">
                      {manifest.learning_objectives.map((obj, oIdx) => (
                        <li key={oIdx} className="flex items-start gap-2 text-xs text-[#4A5168] leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {manifest.gates_used && manifest.gates_used.length > 0 && (
              <div className="pt-3 border-t border-[#ECE8E1] flex items-center gap-2 text-xs text-[#4A5168]">
                <span className="font-semibold text-[#1F2433]">Gates introduced:</span>
                <div className="flex gap-1.5">
                  {manifest.gates_used.map(g => (
                    <span
                      key={g}
                      className="px-2.5 py-0.5 rounded-md font-mono font-bold bg-[#FBFAF7] text-[#1F2433] border border-[#ECE8E1]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* THE ONE CONCEPT FOR THIS PAGE (key forces fresh state per concept) */}
        <LessonBlock
          key={activeConcept.id}
          concept={activeConcept}
          conceptIndex={activeIndex}
          totalConcepts={concepts.length}
          topicId={manifest.id}
          isViewed={viewedSet.has(activeConcept.id)}
          onOpenTutorWithConcept={handleOpenTutorForConcept}
          quickChecks={topicData.quick_checks || []}
          comparisonTables={topicData.content?.comparison_tables || []}
        />

        {/* PRACTICE for this concept (topic assessments linked via concept_links) */}
        <ConceptPractice
          key={`practice-${activeConcept.id}`}
          topicId={manifest.id}
          conceptId={activeConcept.id}
          assessments={topicData.assessments || []}
        />

        {/* Final page extras: reference tables + topic completion */}
        {isLast && (
          <>
            {topicData.content?.comparison_tables && topicData.content.comparison_tables.length > 0 && (
              <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#ECE8E1] shadow-xs space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-[#ECE8E1]">
                  <div className="w-9 h-9 rounded-2xl bg-[#EEF0FF] text-[#4F46E5] flex items-center justify-center font-bold shadow-2xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-[#1F2433]">
                      Topic Summary: Comparison &amp; Reference Tables
                    </h2>
                    <p className="text-xs text-[#4A5168]">
                      Review tables covering everything in this topic.
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  {topicData.content.comparison_tables.map((table, tIdx) => (
                    <ComparisonTable key={table.id || tIdx} table={table} />
                  ))}
                </div>
              </section>
            )}

            <section className="p-6 sm:p-8 rounded-3xl bg-[#EEF0FF] border border-[#4F46E5]/30 shadow-sm text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#4F46E5] text-xs font-bold border border-[#4F46E5]/20 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span>All {concepts.length} concepts covered</span>
              </div>
              <h2 className="font-heading text-2xl font-bold text-[#1F2433]">
                You finished “{manifest.title}”
              </h2>
              <p className="text-xs sm:text-sm text-[#4A5168] max-w-xl mx-auto leading-relaxed">
                Test yourself on the full topic quiz, experiment in the Quantum Lab, or move on to the next topic.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to={`/practice?topic=${encodeURIComponent(manifest.id)}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F2705A] hover:bg-[#E05A44] text-white text-sm font-bold shadow-xs transition-all"
                >
                  <Award className="w-4 h-4" />
                  <span>Take Full Topic Quiz</span>
                </Link>
                <Link
                  to={`/lab?topic=${encodeURIComponent(manifest.id)}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0E9F9B] hover:bg-[#0B7A77] text-white text-sm font-bold shadow-xs transition-all"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Try it in the Quantum Lab</span>
                </Link>
                {nextTopic && (
                  <Link
                    to={`/learn?topic=${encodeURIComponent(nextTopic.id)}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#FBFAF7] text-[#1F2433] border border-[#ECE8E1] text-sm font-bold shadow-xs transition-all"
                  >
                    <span>Next Topic: {nextTopic.title}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* STICKY PREV / NEXT NAVIGATION */}
      <nav
        aria-label="Concept navigation"
        className="sticky bottom-0 z-20 border-t border-[#ECE8E1] bg-white/95 backdrop-blur-sm"
      >
        <div className="max-w-4xl xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            id="concept-prev"
            type="button"
            onClick={() => goToConcept(activeIndex - 1)}
            disabled={isFirst}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#ECE8E1] bg-white text-[#1F2433] text-sm font-bold transition-all hover:bg-[#FBFAF7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-w-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[180px]">
              {prevConcept ? prevConcept.title : 'Previous'}
            </span>
            <span className="sm:hidden">Prev</span>
          </button>

          <span className="font-mono text-xs font-bold text-[#4A5168] shrink-0">
            {activeIndex + 1} / {concepts.length}
          </span>

          {isLast ? (
            <Link
              id="concept-finish"
              to={`/practice?topic=${encodeURIComponent(manifest.id)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2705A] hover:bg-[#E05A44] text-white text-sm font-bold shadow-xs transition-all min-w-0"
            >
              <span className="truncate">Finish: Topic Quiz</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          ) : (
            <button
              id="concept-next"
              type="button"
              onClick={() => goToConcept(activeIndex + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold shadow-xs transition-all cursor-pointer min-w-0"
            >
              <span className="hidden sm:inline truncate max-w-[220px]">Next: {nextConcept?.title}</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
