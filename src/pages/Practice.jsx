import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import apiClient from '../api/client';
import JourneyBar from '../components/JourneyBar';
import { recordAssessmentAnswer, calculateTopicProgress, getStoredProgress } from '../utils/progress';

export default function Practice({ onOpenTutor }) {
  const [searchParams] = useSearchParams();
  const requestedTopicId = searchParams.get('topic');

  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [userAnswers, setUserAnswers] = useState({}); // {questionId: selectedIndex}
  const [results, setResults] = useState({}); // {questionId: checkResult}
  const [checking, setChecking] = useState({});

  useEffect(() => {
    async function loadCurriculum() {
      try {
        setLoading(true);
        const manifestList = await apiClient.getTopics();
        setTopics(manifestList);

        let active = null;
        if (requestedTopicId) {
          active = manifestList.find(t => t.id === requestedTopicId);
        }
        if (!active && manifestList.length > 0) {
          active = manifestList[0];
        }
        setCurrentTopic(active);

        if (active) {
          const data = await apiClient.getTopic(active.id);
          setTopicData(data);
        }
      } catch (err) {
        setError(`Failed to load practice questions: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }
    loadCurriculum();
  }, [requestedTopicId]);

  const handleSelectOption = async (questionId, optionIndex) => {
    if (results[questionId] || checking[questionId]) return;

    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    setChecking(prev => ({ ...prev, [questionId]: true }));

    try {
      const res = await apiClient.checkAssessment(currentTopic.id, questionId, optionIndex);
      setResults(prev => ({ ...prev, [questionId]: res }));
      recordAssessmentAnswer(currentTopic.id, questionId, res.is_correct);
    } catch (e) {
      console.error('Assessment check failed:', e);
    } finally {
      setChecking(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setResults({});
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <JourneyBar currentStage="practice" onOpenTutor={onOpenTutor} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#F2705A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#4A5168] font-medium">Loading practice questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topicData) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <JourneyBar currentStage="practice" onOpenTutor={onOpenTutor} />
        <div className="flex-1 p-8 max-w-xl mx-auto">
          <div className="p-6 rounded-2xl bg-[#FFF4DB] border border-[#F59E0B]/30 text-[#1F2433] space-y-3">
            <h2 className="font-heading font-bold text-base text-[#F59E0B]">
              Practice Unavailable
            </h2>
            <p className="text-xs text-[#4A5168]">{error || 'Topic not found.'}</p>
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

  const assessments = topicData.assessments || [];
  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter(r => r.is_correct).length;
  const progressInfo = calculateTopicProgress(currentTopic.id, topicData.concepts?.length || 0, assessments.length);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Persistent Journey Bar */}
      <JourneyBar
        currentStage="practice"
        completedStages={progressInfo.isCompleted ? ['learn', 'ask', 'build', 'run', 'understand', 'practice'] : ['learn']}
        onOpenTutor={onOpenTutor}
        topicId={currentTopic.id}
      />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Practice Header Banner */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#ECE8E1] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#FDEBE7] text-[#F2705A] border border-[#F2705A]/20">
                Practice Quiz
              </span>
              <span className="text-xs text-[#4A5168] font-medium">
                Topic {currentTopic.id}: {currentTopic.title}
              </span>
            </div>

            {answeredCount > 0 && (
              <button
                type="button"
                onClick={handleResetQuiz}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#ECE8E1] text-xs font-semibold text-[#4A5168] hover:text-[#1F2433] hover:bg-[#FBFAF7] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Answers</span>
              </button>
            )}
          </div>

          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1F2433] tracking-tight">
              Check Your Understanding
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#4A5168] leading-relaxed">
              Verify your mental model with immediate, explanatory feedback. All questions are checked against verified ground-truth rules.
            </p>
          </div>

          {/* Score & Progress */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE8E1] text-xs text-[#4A5168]">
            <div className="flex items-center gap-3">
              <span>Progress: <strong>{answeredCount}</strong> of <strong>{assessments.length}</strong> questions answered</span>
              {answeredCount > 0 && (
                <span className="font-semibold text-[#16A34A]">
                  ({correctCount} correct)
                </span>
              )}
            </div>

            <span className="font-mono font-bold text-[#1F2433]">
              Calculated Topic Progress: {progressInfo.percentage}%
            </span>
          </div>
        </section>

        {/* Question Cards */}
        <section className="space-y-6">
          {assessments.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-[#ECE8E1] text-center text-xs text-[#4A5168]">
              No practice questions registered for this topic yet.
            </div>
          ) : (
            assessments.map((q, qIndex) => {
              const selectedOpt = userAnswers[q.id];
              const res = results[q.id];
              const isAnswered = res !== undefined;
              const isChecking = checking[q.id];

              return (
                <article
                  key={q.id}
                  className={`p-6 sm:p-7 rounded-3xl bg-white border transition-all ${
                    isAnswered
                      ? res.is_correct
                        ? 'border-[#16A34A]/30 shadow-2xs'
                        : 'border-[#DC2626]/20 shadow-2xs'
                      : 'border-[#ECE8E1] shadow-xs'
                  } space-y-4`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FBFAF7] text-[#4A5168] border border-[#ECE8E1]">
                      Question {qIndex + 1}
                    </span>
                    {isAnswered && (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                        res.is_correct ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}>
                        {res.is_correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span>{res.is_correct ? 'Correct' : 'Needs Review'}</span>
                      </span>
                    )}
                  </div>

                  <h2 className="font-heading text-base sm:text-lg font-bold text-[#1F2433] leading-snug">
                    {q.question}
                  </h2>

                  {/* Options */}
                  <div className="space-y-2">
                    {q.options.map((option, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      let btnClasses = 'bg-[#FBFAF7] border-[#ECE8E1] text-[#1F2433] hover:bg-white hover:border-[#4F46E5]/40';

                      if (isAnswered) {
                        if (optIdx === q.correct_option_index) {
                          btnClasses = 'bg-[#E4F6EA] border-[#16A34A] text-[#16A34A] font-bold';
                        } else if (isSelected && !res.is_correct) {
                          btnClasses = 'bg-[#FDECEC] border-[#DC2626] text-[#DC2626] font-semibold';
                        } else {
                          btnClasses = 'bg-[#FBFAF7] border-[#ECE8E1] text-[#4A5168] opacity-50';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          disabled={isAnswered || isChecking}
                          className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm leading-relaxed transition-all flex items-start gap-3 cursor-pointer ${btnClasses}`}
                        >
                          <span className="font-mono font-bold text-xs shrink-0 mt-0.5">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="flex-1">{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanatory Feedback */}
                  {isAnswered && (
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-1.5 animate-in fade-in duration-200 ${
                        res.is_correct
                          ? 'bg-[#E4F6EA] text-[#16A34A] border border-[#16A34A]/20'
                          : 'bg-[#FDECEC] text-[#DC2626] border border-[#DC2626]/20'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {res.is_correct ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                        <span>{res.is_correct ? 'Nicely done!' : 'Explanation:'}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#1F2433]">
                        {res.explanation || q.explanation}
                      </p>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        {/* Completion Card */}
        {answeredCount === assessments.length && assessments.length > 0 && (
          <section className="p-6 sm:p-8 rounded-3xl bg-[#E4F6EA] border border-[#16A34A]/30 text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center mx-auto shadow-xs">
              <Award className="w-6 h-6" />
            </div>

            <div>
              <h2 className="font-heading text-2xl font-extrabold text-[#1F2433]">
                Practice Complete!
              </h2>
              <p className="text-xs sm:text-sm text-[#4A5168] mt-1">
                You got {correctCount} of {assessments.length} questions correct on Topic {currentTopic.id}.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to={`/learn?topic=${encodeURIComponent(currentTopic.id)}`}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#FBFAF7] text-[#1F2433] border border-[#ECE8E1] text-xs font-bold transition-all shadow-xs"
              >
                Review Lesson
              </Link>

              <Link
                to="/lab"
                className="px-5 py-2.5 rounded-xl bg-[#0E9F9B] hover:bg-[#0B7A77] text-white text-xs font-bold transition-all shadow-xs"
              >
                Experiment in Lab
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
