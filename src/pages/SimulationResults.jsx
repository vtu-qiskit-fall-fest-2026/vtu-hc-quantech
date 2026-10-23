import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BarChart2,
  Cpu,
  HelpCircle,
  Award,
  Atom,
  Check,
  X,
  ShieldCheck,
  Binary
} from 'lucide-react';
import JourneyStrip from '../components/JourneyStrip';
import apiClient from '../api/client';
import { recordAssessmentAnswer } from '../utils/progress';

export default function SimulationResults() {
  const location = useLocation();
  const navigate = useNavigate();

  const telemetry = location.state?.telemetry;
  const circuit = location.state?.circuit;
  const topicId = location.state?.topicId || null;

  // AI explanation state
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Quick check state after result
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [checkingQuiz, setCheckingQuiz] = useState(false);

  // Dynamic load of topic assessment or fallback generic quiz
  useEffect(() => {
    async function loadQuiz() {
      if (topicId) {
        try {
          const data = await apiClient.getTopic(topicId);
          if (data?.assessments && data.assessments.length > 0) {
            const first = data.assessments[0];
            setQuizQuestion({
              id: first.id,
              question: first.question,
              options: first.options,
              correctIndex: first.correct_option_index,
              explanation: first.explanation
            });
            return;
          }
        } catch (e) {
          console.error('Failed to load topic assessment:', e);
        }
      }

      // Telemetry-derived generic fallback check
      setQuizQuestion({
        id: 'SIM_Q01',
        question: 'What does a statevector measurement probability of 100% (or 1.0) mathematically represent?',
        options: [
          'A deterministic outcome where repeated measurements in this basis always yield this exact bitstring',
          'A random guess made by the classical computer when simulating qubits',
          'That all other quantum gates have been cancelled out or ignored',
          'That the quantum computer is operating at absolute zero temperature'
        ],
        correctIndex: 0,
        explanation: 'In quantum mechanics, when the absolute amplitude squared |α|² equals 1.0, measuring in the computational basis produces that bitstring with certainty.'
      });
    }

    loadQuiz();
  }, [topicId]);

  const handleAskAIAboutResult = async (customPrompt = null) => {
    setLoadingAi(true);
    try {
      const q = customPrompt || 'Explain what happened in my quantum simulation and the physics behind the result.';
      const res = await apiClient.askTutor(q, topicId, null, circuit, telemetry);
      setAiExplanation(res);
    } catch (e) {
      console.error('Failed to get AI explanation for result:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCheckQuiz = async (optionIdx) => {
    if (!quizQuestion) return;
    setSelectedOption(optionIdx);
    setCheckingQuiz(true);
    try {
      if (topicId) {
        const res = await apiClient.checkAssessment(topicId, quizQuestion.id, optionIdx);
        setQuizAnswered(res);
        recordAssessmentAnswer(topicId, quizQuestion.id, res.is_correct);
        return;
      }
      throw new Error('No topic ID');
    } catch (e) {
      // Local evaluation fallback
      const isCorrect = (optionIdx === quizQuestion.correctIndex);
      const fallbackResult = {
        is_correct: isCorrect,
        feedback: isCorrect ? 'Spot on! Correct physical interpretation.' : 'Not quite. Check the probability formulation.',
        explanation: quizQuestion.explanation
      };
      setQuizAnswered(fallbackResult);
      if (topicId) {
        recordAssessmentAnswer(topicId, quizQuestion.id, isCorrect);
      }
    } finally {
      setCheckingQuiz(false);
    }
  };

  if (!telemetry) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
        <JourneyStrip activeStep="understand" topicId={topicId} />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <Atom className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No Simulation Data Found</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Run a circuit in the Quantum Lab to view verified statevector probabilities and mathematical telemetry.
            </p>
            <Link
              to="/lab"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <span>Go to Quantum Lab</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const probs = telemetry.probabilities || {};
  const sortedStates = Object.keys(probs).sort();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50">
      <JourneyStrip activeStep="understand" topicId={topicId} />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Result Header & Verification Badges */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Simulation Complete
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Computed on a {telemetry.num_qubits}-qubit register using exact statevector projection.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mathematical Authority Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified by Quantum Simulator</span>
            </span>

            {/* Optional Qiskit Aer Cross-Check Badge */}
            {telemetry.cross_checked_with_aer && telemetry.aer_agreement && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
                <Cpu className="w-4 h-4 text-cyan-600" />
                <span>Cross-checked with Qiskit Aer</span>
              </span>
            )}
          </div>
        </div>

        {/* Measurement Probabilities Histogram / Bars */}
        <section className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Computational Basis Measurement Probabilities
              </h3>
            </div>
            <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
              Normalization: {telemetry.normalized ? '100% Preserved' : 'Failed'}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {sortedStates.map((bitstring) => {
              const p = probs[bitstring];
              const pct = (p * 100).toFixed(1);
              const isNonZero = p > 0.001;

              return (
                <div key={bitstring} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono font-medium">
                    <span className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200 text-xs">
                        |{bitstring}⟩
                      </span>
                      {isNonZero && (
                        <span className="text-[11px] text-slate-400 font-sans">
                          amplitude magnitude: <span className="font-mono text-slate-600">{Math.sqrt(p).toFixed(3)}</span>
                        </span>
                      )}
                    </span>
                    <span className={`font-bold font-mono ${isNonZero ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isNonZero
                          ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-xs'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sampled Measurement Runs (Shots) if present */}
          {telemetry.shots_counts && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-indigo-500" />
                <span>Simulated Measurement Runs ({telemetry.shots || 1000} shots sampling):</span>
              </span>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(telemetry.shots_counts).map(([state, count]) => (
                  <div key={state} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs flex items-center space-x-1.5">
                    <strong className="text-slate-800">|{state}⟩:</strong>
                    <span className="text-indigo-600 font-semibold">{count} counts</span>
                    <span className="text-slate-400">({((count / (telemetry.shots || 1000)) * 100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Mathematical Telemetry Explanation ("What happened?") */}
        <section className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                What happened? (Telemetry Analysis)
              </h3>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              telemetry.is_entangled
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {telemetry.is_entangled ? 'Entangled State' : 'Product State'}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 font-sans">
            {telemetry.explanation}
          </div>

          {/* Explanation Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleAskAIAboutResult()}
              disabled={loadingAi}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>{loadingAi ? 'AI is analyzing result...' : 'Ask AI about this result'}</span>
            </button>

            <button
              onClick={() => handleAskAIAboutResult('Explain the mathematics and amplitude calculations for this simulation.')}
              disabled={loadingAi}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              Explain the mathematics
            </button>

            <Link
              to="/lab"
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Build another circuit</span>
            </Link>
          </div>

          {/* AI In-depth Response Box if requested */}
          {aiExplanation && (
            <div className="mt-4 p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Grounded AI Explanation
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 font-medium">
                  {aiExplanation.generated_by === 'llm' ? `LLM (${aiExplanation.model})` : 'Built-in Fallback Tutor'}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {aiExplanation.answer}
              </div>
            </div>
          )}
        </section>

        {/* Post-Simulation Quick Understanding Check */}
        {quizQuestion && (
          <section className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Quick Understanding Check
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Practice your intuition</span>
            </div>

            <p className="text-sm font-semibold text-slate-900">
              {quizQuestion.question}
            </p>

            <div className="space-y-2.5">
              {quizQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                let btnClass = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';

                if (quizAnswered) {
                  if (idx === quizQuestion.correctIndex) {
                    btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                  } else if (isSelected && !quizAnswered.is_correct) {
                    btnClass = 'border-rose-500 bg-rose-50 text-rose-900';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => !quizAnswered && handleCheckQuiz(idx)}
                    disabled={Boolean(quizAnswered) || checkingQuiz}
                    className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start justify-between gap-3 shadow-2xs ${btnClass}`}
                  >
                    <span>{opt}</span>
                    {quizAnswered && idx === quizQuestion.correctIndex && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {quizAnswered && isSelected && !quizAnswered.is_correct && (
                      <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {quizAnswered && (
              <div className={`p-4 rounded-xl text-xs space-y-1 ${
                quizAnswered.is_correct
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {quizAnswered.is_correct ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
                  <span>{quizAnswered.feedback}</span>
                </div>
                <p className="pt-1 text-slate-700 leading-relaxed font-sans">
                  {quizAnswered.explanation}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
