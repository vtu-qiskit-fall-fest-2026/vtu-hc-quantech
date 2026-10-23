import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  Eye,
  Code,
  Sparkles,
  HelpCircle,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Atom,
  Clock
} from 'lucide-react';
import apiClient from '../api/client';
import JourneyStrip from '../components/JourneyStrip';
import { markConceptViewed, getStoredProgress } from '../utils/progress';

export default function Learning() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedTopicId = searchParams.get('topic');

  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedConcept, setExpandedConcept] = useState(null);
  const [technicalOpen, setTechnicalOpen] = useState({});

  useEffect(() => {
    async function loadTopicContent() {
      try {
        setLoading(true);
        // 1. Get manifests to resolve topic ID if missing
        const manifestList = await apiClient.getTopics();
        setTopics(manifestList);

        let activeId = requestedTopicId;
        if (!activeId && manifestList.length > 0) {
          activeId = manifestList[0].id;
        }

        if (!activeId) {
          setError('No curriculum topics found.');
          setLoading(false);
          return;
        }

        const activeManifest = manifestList.find(m => m.id === activeId) || manifestList[0];
        setCurrentTopic(activeManifest);

        // 2. Fetch full topic learner view
        const data = await apiClient.getTopic(activeId);
        setTopicData(data);
        if (data.concepts && data.concepts.length > 0) {
          setExpandedConcept(data.concepts[0].id);
          markConceptViewed(activeId, data.concepts[0].id);
        }
      } catch (err) {
        setError(`Failed to load topic content: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }
    loadTopicContent();
  }, [requestedTopicId]);

  const handleSelectConcept = (cId) => {
    setExpandedConcept(cId);
    if (currentTopic) {
      markConceptViewed(currentTopic.id, cId);
    }
  };

  const toggleTechnical = (cId) => {
    setTechnicalOpen(prev => ({ ...prev, [cId]: !prev[cId] }));
  };

  const handleTryInLab = (circuit) => {
    navigate('/lab', { state: { initialCircuit: circuit, topicId: currentTopic?.id } });
  };

  const handleAskAI = (concept) => {
    navigate(`/tutor?topic=${encodeURIComponent(currentTopic?.id)}&q=${encodeURIComponent(`What is ${concept.title}? Explain simply.`)}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <JourneyStrip activeStep="learn" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold tracking-wide">Loading topic curriculum...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topicData) {
    return (
      <div className="flex-1 flex flex-col">
        <JourneyStrip activeStep="learn" />
        <div className="flex-1 p-8">
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm max-w-xl mx-auto">
            <h2 className="font-bold text-base">Curriculum Topic Unavailable</h2>
            <p className="mt-1 text-xs text-amber-700">{error || 'Topic not found.'}</p>
            <Link
              to="/"
              className="mt-4 inline-block px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { manifest, concepts } = topicData;
  const progress = getStoredProgress();
  const viewedSet = new Set(progress.topics[manifest.id]?.viewedConcepts || []);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <JourneyStrip activeStep="learn" topicId={manifest.id} />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Topic Header Banner */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Topic {manifest.id}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {manifest.estimated_minutes} min
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/tutor?topic=${encodeURIComponent(manifest.id)}`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ask AI Tutor</span>
              </Link>
              <Link
                to={`/practice?topic=${encodeURIComponent(manifest.id)}`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold transition-colors"
              >
                <span>Take Quick Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {manifest.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed font-normal">
            {manifest.summary}
          </p>

          {/* Gates in Topic */}
          {manifest.gates_used && manifest.gates_used.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Gates introduced:</span>
              <div className="flex gap-1.5">
                {manifest.gates_used.map(g => (
                  <span key={g} className="px-2.5 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Concept Navigation Pill Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {concepts.map((c, i) => {
            const isSelected = expandedConcept === c.id;
            const isRead = viewedSet.has(c.id);

            return (
              <button
                key={c.id}
                onClick={() => handleSelectConcept(c.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                    : isRead
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{i + 1}. {c.title}</span>
                {isRead && <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />}
              </button>
            );
          })}
        </div>

        {/* Selected Concept Card */}
        {concepts.map(concept => {
          if (concept.id !== expandedConcept) return null;
          const isTechOpen = technicalOpen[concept.id];

          return (
            <article
              key={concept.id}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6"
            >
              {/* Concept Title & ID */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 block mb-1">
                    Concept ID: {concept.id}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {concept.title}
                  </h2>
                </div>

                <button
                  onClick={() => handleAskAI(concept)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Explain Deeper with AI</span>
                </button>
              </div>

              {/* 1. Simple Explanation */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                  <BookOpen className="w-4 h-4" />
                  <span>What is this? (Plain Language)</span>
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-normal">
                  {concept.simple_explanation}
                </p>
              </div>

              {/* 2. Visual Explanation */}
              {concept.visual_explanation && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-800">
                    <Eye className="w-4 h-4 text-sky-600" />
                    <span>Visual Intuition</span>
                  </div>
                  <p className="text-sm text-sky-950 leading-relaxed font-normal">
                    {concept.visual_explanation}
                  </p>
                </div>
              )}

              {/* 3. Concrete Example */}
              {concept.example && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Concrete Example
                  </h4>
                  <p className="text-sm text-emerald-950 leading-relaxed font-normal">
                    {concept.example}
                  </p>
                </div>
              )}

              {/* Circuit Experiment (if available) */}
              {concept.circuit_example && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Atom className="w-4 h-4 text-indigo-600" />
                      Try It In The Quantum Lab
                    </span>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Run this concept's quantum circuit directly in our verified statevector simulator.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTryInLab(concept.circuit_example)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-sm shadow-indigo-200"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open in Lab</span>
                  </button>
                </div>
              )}

              {/* 4. Technical Explanation (Expandable / Progressive Disclosure) */}
              {concept.technical_explanation && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleTechnical(concept.id)}
                    className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-slate-500" />
                      <span>Technical & Mathematical Details</span>
                    </span>
                    {isTechOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isTechOpen && (
                    <div className="mt-3 p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed border border-slate-800 shadow-inner">
                      {concept.technical_explanation}
                    </div>
                  )}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAskAI(concept)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    What does this mean?
                  </button>
                  <button
                    onClick={() => toggleTechnical(concept.id)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    {isTechOpen ? 'Hide Math' : 'Show Mathematics'}
                  </button>
                </div>

                <Link
                  to={`/practice?topic=${encodeURIComponent(manifest.id)}`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-indigo-200 transition-all"
                >
                  <span>Practice Quick Check</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
