import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Wrench, Sparkles, CheckCircle2, Lock, ArrowRight, Play, Award, Compass, Cpu, Layers } from 'lucide-react';
import apiClient from '../api/client';
import JourneyStrip from '../components/JourneyStrip';
import { getStoredProgress, calculateTopicProgress } from '../utils/progress';

export default function Dashboard() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCurriculum() {
      try {
        setLoading(true);
        const data = await apiClient.getTopics();
        setTopics(data);
      } catch (err) {
        setError('Could not load topics from the server. Ensure the backend is running.');
      } finally {
        setLoading(false);
      }
    }
    loadCurriculum();
  }, []);

  const progress = getStoredProgress();

  // Find active topic (first ready topic, or first topic)
  let activeTopic = null;
  if (topics.length > 0) {
    activeTopic = topics.find(t => t.status === 'ready') || topics[0];
  }

  // Calculate real progress for active topic
  const activeProg = activeTopic
    ? calculateTopicProgress(activeTopic.id, activeTopic.concepts_count || 0, activeTopic.assessments_count || 0, activeTopic.completion_threshold || 0.75)
    : { percentage: 0 };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Loading educational curriculum...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm max-w-xl mx-auto">
          <h2 className="font-bold text-base">Unable to Connect to Quantum Backend</h2>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <JourneyStrip activeStep="learn" topicId={activeTopic?.id} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Visual Hero Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-50/90 via-sky-50/50 to-white p-6 sm:p-8 border border-indigo-100/80 shadow-xs">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Interactive Quantum Computing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Master Quantum Principles Step by Step
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              Learn qubits, superposition, and entanglement with zero hype. Build verified circuits in our simulator and get grounded explanations from your dedicated AI tutor.
            </p>
          </div>

          {/* Decorative Quantum Orbitals (Subtle SVG in background) */}
          <div className="absolute -right-8 -bottom-10 opacity-20 pointer-events-none hidden sm:block">
            <svg width="240" height="240" viewBox="0 0 200 200">
              <ellipse cx="100" cy="100" rx="90" ry="35" fill="none" stroke="#4F46E5" strokeWidth="2" transform="rotate(30 100 100)" />
              <ellipse cx="100" cy="100" rx="90" ry="35" fill="none" stroke="#06B6D4" strokeWidth="2" transform="rotate(-30 100 100)" />
              <circle cx="100" cy="100" r="14" fill="#4F46E5" />
            </svg>
          </div>
        </div>

        {/* Primary Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Continue Learning */}
          {activeTopic && (
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    <BookOpen className="w-3.5 h-3.5" /> Current Topic
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                    {activeTopic.estimated_minutes} min lesson
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-1.5">
                    {activeTopic.title}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {activeTopic.summary}
                  </p>
                </div>

                {/* Real Progress Bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">Topic Progress</span>
                    <span className="text-indigo-600">{activeProg.percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 transition-all duration-700 rounded-full"
                      style={{ width: `${Math.max(activeProg.percentage, 4)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>{activeProg.conceptsViewed} concepts explored</span>
                    <span>{activeProg.assessmentsCorrect} quick checks passed</span>
                  </div>
                </div>
              </div>

              <Link
                to={`/learn?topic=${encodeURIComponent(activeTopic.id)}`}
                className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all"
              >
                <span>Continue Learning</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Card 2: Your Quantum Lab */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
                  <Wrench className="w-3.5 h-3.5" /> Interactive Lab
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                  {progress.circuitsRunCount || 0} circuits simulated
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-1.5">
                  Quantum Circuit Lab
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Build and simulate quantum circuits wire by wire. Place Hadamard and CNOT gates to verify superposition, entanglement, and statevector measurements.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-900 block mb-0.5">Click-to-Place</span>
                  Visual gate palette
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-900 block mb-0.5">Statevector Math</span>
                  NumPy verified telemetry
                </div>
              </div>
            </div>

            <Link
              to="/lab"
              className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-200 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Open Quantum Lab</span>
            </Link>
          </div>
        </div>

        {/* Learning Path Strip */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Curriculum Learning Path
              </h3>
              <p className="text-xs text-slate-500">
                Topics discovered dynamically from the content pack registry.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {topics.length} {topics.length === 1 ? 'topic' : 'topics'} registered
            </span>
          </div>

          <div className="space-y-3">
            {topics.map((t, idx) => {
              const isComingSoon = t.status === 'coming_soon';
              const tProg = calculateTopicProgress(t.id, t.concepts_count || 0, t.assessments_count || 0, t.completion_threshold || 0.75);
              const isCurrent = activeTopic?.id === t.id;

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isComingSoon
                      ? 'bg-slate-50/60 border-slate-200 opacity-60'
                      : isCurrent
                      ? 'bg-white border-indigo-500 shadow-sm ring-2 ring-indigo-50'
                      : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 shadow-2xs ${
                        tProg.isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCurrent
                          ? 'bg-indigo-600 text-white shadow-indigo-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tProg.isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-600">
                          Topic {t.id}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">
                          {t.title}
                        </h4>
                        {isComingSoon && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Coming Soon
                          </span>
                        )}
                        {tProg.isCompleted && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {t.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 w-full sm:w-auto justify-end">
                    {!isComingSoon && (
                      <div className="hidden md:block text-right text-xs">
                        <span className="font-bold text-slate-800">
                          {tProg.percentage}%
                        </span>
                        <span className="text-slate-400 text-[10px] block">completed</span>
                      </div>
                    )}

                    {isComingSoon ? (
                      <span className="text-xs text-slate-400 italic">Prerequisites required</span>
                    ) : (
                      <Link
                        to={`/learn?topic=${encodeURIComponent(t.id)}`}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors inline-flex items-center space-x-1"
                      >
                        <span>{tProg.percentage > 0 ? 'Resume' : 'Start'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
