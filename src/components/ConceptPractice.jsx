import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import apiClient from '../api/client';
import { recordAssessmentAnswer } from '../utils/progress';

/**
 * Practice questions linked to a single concept (via assessment.concept_links).
 * Answers are checked by the backend /assessment/check endpoint and recorded
 * with the same question IDs used on the Practice page, so progress is shared.
 */
export default function ConceptPractice({ topicId, conceptId, assessments = [] }) {
  const linked = (assessments || []).filter(
    q => Array.isArray(q.concept_links) && q.concept_links.includes(conceptId)
  );

  const [answers, setAnswers] = useState({});   // { questionId: selectedIndex }
  const [results, setResults] = useState({});   // { questionId: checkResponse }
  const [checking, setChecking] = useState({}); // { questionId: bool }
  const [errors, setErrors] = useState({});     // { questionId: message }

  if (linked.length === 0) return null;

  const handleSelect = async (questionId, optionIndex) => {
    if (results[questionId] || checking[questionId]) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    setChecking(prev => ({ ...prev, [questionId]: true }));
    setErrors(prev => ({ ...prev, [questionId]: null }));
    try {
      const res = await apiClient.checkAssessment(topicId, questionId, optionIndex);
      setResults(prev => ({ ...prev, [questionId]: res }));
      recordAssessmentAnswer(topicId, questionId, res.is_correct);
    } catch (e) {
      setAnswers(prev => ({ ...prev, [questionId]: undefined }));
      setErrors(prev => ({ ...prev, [questionId]: 'Could not check your answer. Is the backend running?' }));
    } finally {
      setChecking(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter(r => r?.is_correct).length;

  return (
    <section
      id="concept-practice"
      className="p-6 sm:p-8 rounded-3xl bg-white border border-[#ECE8E1] shadow-xs space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#ECE8E1]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#FDECE8] text-[#F2705A] flex items-center justify-center shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-[#1F2433]">Practice: This Concept</h2>
            <p className="text-xs text-[#4A5168]">
              {linked.length} question{linked.length > 1 ? 's' : ''} from the topic assessment, checked by the server.
            </p>
          </div>
        </div>
        {answeredCount > 0 && (
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#FBFAF7] text-[#1F2433] border border-[#ECE8E1]">
            {correctCount}/{answeredCount} correct
          </span>
        )}
      </div>

      <div className="space-y-6">
        {linked.map((q, qIdx) => {
          const result = results[q.id];
          const selected = answers[q.id];
          const isChecking = checking[q.id];

          return (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-semibold text-[#1F2433] leading-relaxed">
                <span className="font-mono text-xs text-[#F2705A] mr-2">Q{qIdx + 1}.</span>
                {q.question}
              </p>

              <div className="space-y-2">
                {(q.options || []).map((opt, oIdx) => {
                  let style = 'bg-white border-[#ECE8E1] text-[#1F2433] hover:border-[#F2705A]/50 hover:bg-[#FBFAF7]';
                  if (result) {
                    if (oIdx === result.correct_option_index) {
                      style = 'bg-[#E4F6EA] border-[#16A34A] text-[#16A34A] font-semibold';
                    } else if (oIdx === selected) {
                      style = 'bg-[#FDECEC] border-[#DC2626] text-[#DC2626]';
                    } else {
                      style = 'bg-white border-[#ECE8E1] text-[#4A5168] opacity-60';
                    }
                  } else if (isChecking && oIdx === selected) {
                    style = 'bg-[#FBFAF7] border-[#F2705A] text-[#1F2433]';
                  }

                  return (
                    <button
                      key={oIdx}
                      id={`practice-${conceptId}-${q.id}-opt-${oIdx}`}
                      type="button"
                      disabled={!!result || isChecking}
                      onClick={() => handleSelect(q.id, oIdx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm leading-snug transition-all flex items-start gap-2.5 cursor-pointer disabled:cursor-default ${style}`}
                    >
                      <span className="font-mono font-bold text-[11px] shrink-0 mt-0.5">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <span className="flex-1">{opt}</span>
                      {isChecking && oIdx === selected && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {errors[q.id] && (
                <p className="text-xs text-[#DC2626]">{errors[q.id]}</p>
              )}

              {result && (
                <div
                  className={`p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 border ${
                    result.is_correct
                      ? 'bg-[#E4F6EA] text-[#14532D] border-[#16A34A]/20'
                      : 'bg-[#FDECEC] text-[#7F1D1D] border-[#DC2626]/20'
                  }`}
                >
                  {result.is_correct
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16A34A]" />
                    : <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />}
                  <div className="space-y-1">
                    {result.feedback && <p className="font-semibold">{result.feedback}</p>}
                    {result.explanation && <p>{result.explanation}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
