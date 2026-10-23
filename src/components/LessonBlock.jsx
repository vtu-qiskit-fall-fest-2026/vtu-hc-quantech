import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wrench,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Code2
} from 'lucide-react';
import VisualRenderer from '../visuals/VisualRenderer';
import ComparisonTable from './ComparisonTable';
import { recordAssessmentAnswer } from '../utils/progress';

export default function LessonBlock({
  concept,
  conceptIndex,
  totalConcepts,
  topicId,
  isViewed,
  onOpenTutorWithConcept,
  quickChecks = [],
  comparisonTables = []
}) {
  const navigate = useNavigate();
  const [techOpen, setTechOpen] = useState(false);
  const [quickCheckAnswer, setQuickCheckAnswer] = useState(null);
  const [quickCheckSubmitted, setQuickCheckSubmitted] = useState(false);

  // Hook: short plain-language reason why it matters
  const hook = concept.hook || concept.why_it_matters || `Why it matters: Understanding ${concept.title.toLowerCase()} is fundamental to harnessing quantum advantage.`;

  // Analogy parsing: check if analogy text is present in visual_explanation or explicit analogy field
  const analogyText = concept.analogy || (
    concept.visual_explanation?.toLowerCase().includes('like ') ||
    concept.visual_explanation?.toLowerCase().includes('picture ')
      ? concept.visual_explanation
      : null
  );

  // Find relevant comparison tables for this concept
  const relevantTables = (comparisonTables || []).filter(t => {
    if (!t) return false;
    if (t.related_concept && t.related_concept.includes(concept.id)) return true;
    const titleLower = (t.title || '').toLowerCase();
    const cTitleLower = (concept.title || '').toLowerCase();
    if (titleLower.includes('shor') && cTitleLower.includes('shor')) return true;
    if (titleLower.includes('pqc') && cTitleLower.includes('post-quantum')) return true;
    if (titleLower.includes('nisq') && (cTitleLower.includes('noisy') || cTitleLower.includes('nisq'))) return true;
    if (titleLower.includes('simulator types') && (cTitleLower.includes('types of simulator') || cTitleLower.includes('state-vector'))) return true;
    if (titleLower.includes('quantum computer vs quantum circuit simulator') && (concept.id === 'C01' || concept.id === 'C02')) return true;
    if (titleLower.includes('three meanings') && (concept.id === 'C02' || cTitleLower.includes('analog'))) return true;
    if (titleLower.includes('ideal simulation vs noisy') && (concept.id === 'C06' || concept.id === 'C08')) return true;
    return false;
  });

  // Find matching quick check question
  const matchingCheck = (quickChecks || []).find(q =>
    q.id === `QC0${conceptIndex + 1}` ||
    q.id === `QC${conceptIndex + 1}` ||
    q.id === concept.id ||
    q.key_concept === concept.id
  ) || (quickChecks && quickChecks[conceptIndex]);

  // Quick check question (concept-specific or generated from example)
  const quickCheckQuestion = getConceptQuickCheck(concept, matchingCheck);

  // Concept-specific interactive quantum action
  const interactiveAction = getConceptInteractiveAction(concept);

  const handleQuickCheckSelect = (idx) => {
    if (quickCheckSubmitted) return;
    setQuickCheckAnswer(idx);
    setQuickCheckSubmitted(true);
    const isCorrect = idx === quickCheckQuestion.correctIndex;
    recordAssessmentAnswer(topicId, `QC_${concept.id}`, isCorrect);
  };

  const handleRunInteractiveAction = (action) => {
    navigate('/lab', {
      state: {
        initialCircuit: action.circuit,
        topicId,
        fromLesson: true,
        conceptId: concept.id,
        visualMode: action.visualMode
      }
    });
  };

  return (
    <article
      id={`concept-${concept.id}`}
      className="p-6 sm:p-8 rounded-3xl bg-white border border-[#ECE8E1] shadow-xs space-y-6 transition-all hover:border-[#4F46E5]/30 scroll-mt-24"
    >
      {/* 1. Header with Concept Number & Explored Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#ECE8E1]/80">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EEF0FF] text-[#4F46E5] border border-[#4F46E5]/20">
            Concept {conceptIndex + 1} of {totalConcepts}
          </span>
          <span className="font-mono text-xs font-medium text-[#717A8C]">
            ID: {concept.id}
          </span>
        </div>

        {isViewed && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] bg-[#E4F6EA] px-2.5 py-0.5 rounded-full border border-[#16A34A]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Explored</span>
          </span>
        )}
      </div>

      {/* Concept Title: What am I learning? */}
      <div>
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1F2433] tracking-tight">
          {concept.title}
        </h2>
      </div>

      {/* 2. WHY THIS MATTERS: Plain-language motivation */}
      <div className="p-4 rounded-2xl bg-[#FFF4DB]/80 border border-[#F59E0B]/30 flex items-start gap-3 text-xs leading-relaxed text-[#1F2433]">
        <div className="w-6 h-6 rounded-lg bg-[#F59E0B]/20 text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-3.5 h-3.5" />
        </div>
        <div className="space-y-0.5">
          <span className="font-bold text-[#D97706] uppercase tracking-wider text-[10px] block">
            Why This Matters
          </span>
          <p className="text-xs text-[#1F2433] font-medium leading-relaxed">{hook}</p>
        </div>
      </div>

      {/* 3. SIMPLE EXPLANATION & HOW IT WORKS */}
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#717A8C] flex items-center gap-1.5">
            <span>Simple Explanation</span>
          </h3>
          <p className="text-base sm:text-lg text-[#1F2433] leading-relaxed font-normal">
            {concept.simple_explanation}
          </p>
        </div>

        {concept.how_it_works && (
          <div className="p-4 rounded-2xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-1">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#4F46E5] block">
              How It Works:
            </span>
            <p className="text-xs sm:text-sm text-[#1F2433] leading-relaxed">
              {concept.how_it_works}
            </p>
          </div>
        )}
      </div>

      {/* 4. VISUAL EXPLANATION: Data-driven visual renderer */}
      <div className="my-4">
        <VisualRenderer concept={concept} />
      </div>

      {/* 5. PHYSICAL ANALOGY: Think of it like... and breakdown */}
      {analogyText && (
        <div className="p-4 rounded-2xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-2 text-xs leading-relaxed">
          <div className="font-heading font-bold text-xs text-[#4F46E5] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Think of it like...</span>
          </div>
          <p className="text-[#1F2433] italic">
            "{analogyText}"
          </p>
          <div className="pt-2 border-t border-[#ECE8E1]/60 text-[11px] text-[#717A8C]">
            <span className="font-semibold text-[#1F2433]">Where this analogy breaks down: </span>
            <span>
              Quantum systems involve true complex probability amplitudes and physical wavefunction collapse upon measurement, which have no exact classical physical counterpart.
            </span>
          </div>
        </div>
      )}

      {/* 6. TECHNICAL EXPLANATION & MATHEMATICAL FORMALISM (Collapsible) */}
      <div className="rounded-2xl border border-[#ECE8E1] bg-[#FBFAF7] overflow-hidden">
        <button
          type="button"
          onClick={() => setTechOpen(prev => !prev)}
          className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-[#1F2433] hover:bg-white transition-colors cursor-pointer"
          aria-expanded={techOpen}
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#4F46E5]" />
            <span>Technical Explanation & Mathematical Formalism</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#717A8C]">
            <span>{techOpen ? 'Hide technical details' : 'Show details'}</span>
            {techOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {techOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-[#ECE8E1] bg-white space-y-4 animate-in fade-in duration-200">
            <div className="space-y-2 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#717A8C] block">
                Rigorous Formalism:
              </span>
              <p className="text-xs sm:text-sm text-[#1F2433] font-mono bg-[#FBFAF7] p-3 rounded-xl border border-[#ECE8E1] leading-relaxed">
                {concept.technical_explanation}
              </p>
              {concept.mathematical_representation && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#717A8C] block mb-1">
                    Mathematical Formulation:
                  </span>
                  <div className="p-3 rounded-xl bg-[#EEF0FF] border border-[#4F46E5]/20 font-mono text-xs text-[#1F2433]">
                    {concept.mathematical_representation}
                  </div>
                </div>
              )}
              <div className="text-[11px] text-[#717A8C] italic pt-1">
                <span className="font-semibold text-[#1F2433]">In words: </span>
                {concept.technical_explanation?.includes('Hilbert')
                  ? 'Quantum states are vectors in high-dimensional vector spaces, where transformations preserve total probability.'
                  : 'The quantum state vector is represented mathematically using complex numbers that dictate measurement statistics.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. WORKED EXAMPLE & PROMINENT QUANTUM SIMULATOR ACTION */}
      <div className="p-5 rounded-2xl bg-white border border-[#ECE8E1] space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0E9F9B] flex items-center gap-1.5">
            <span>Worked Example</span>
          </span>
          {concept.circuit_example && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E3F6F5] text-[#0E9F9B] border border-[#0E9F9B]/20">
              Circuit Available
            </span>
          )}
        </div>

        {concept.example && (
          <p className="text-xs sm:text-sm text-[#1F2433] leading-relaxed">
            {concept.example}
          </p>
        )}

        {/* PROMINENT QUANTUM INTERACTIVE ACTION BUTTON */}
        <div className="p-3.5 rounded-xl bg-[#E3F6F5]/50 border border-[#0E9F9B]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#0E9F9B] flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              <span>Interactive Quantum Simulator</span>
            </div>
            <p className="text-[11px] text-[#717A8C]">
              {interactiveAction.subtext}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleRunInteractiveAction(interactiveAction)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E9F9B] hover:bg-[#0B7A77] text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer shrink-0"
          >
            <span>{interactiveAction.label}</span>
          </button>
        </div>
      </div>

      {/* Key Takeaway */}
      {concept.key_takeaway && (
        <div className="p-3.5 rounded-2xl bg-[#E4F6EA]/70 border border-[#16A34A]/25 flex items-start gap-3 text-xs leading-relaxed text-[#1F2433]">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#16A34A] mr-1.5 uppercase tracking-wide text-[10px]">
              Key Takeaway:
            </span>
            <span>{concept.key_takeaway}</span>
          </div>
        </div>
      )}

      {/* Common Mistake / Pitfall */}
      {concept.common_mistake && (
        <div className="p-3.5 rounded-2xl bg-[#FDECEC]/70 border border-[#DC2626]/20 flex items-start gap-3 text-xs leading-relaxed text-[#1F2433]">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#DC2626] mr-1.5 uppercase tracking-wide text-[10px]">
              Common Pitfall:
            </span>
            <span>{concept.common_mistake}</span>
          </div>
        </div>
      )}

      {/* Try It Challenge */}
      {concept.try_it && (
        <div className="p-3.5 rounded-2xl bg-[#E3F6F5]/60 border border-[#0E9F9B]/25 flex items-start gap-3 text-xs leading-relaxed text-[#1F2433]">
          <Wrench className="w-4 h-4 text-[#0E9F9B] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#0E9F9B] mr-1.5 uppercase tracking-wide text-[10px]">
              Try It:
            </span>
            <span>{concept.try_it}</span>
          </div>
        </div>
      )}

      {/* Relevant Comparison Tables */}
      {relevantTables.map((tbl, tIdx) => (
        <div key={tbl.id || tIdx} className="pt-2">
          <ComparisonTable table={tbl} />
        </div>
      ))}

      {/* 7. QUICK CHECK: One short question with immediate feedback */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FBFAF7] border border-[#ECE8E1] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F2705A] flex items-center gap-1.5">
            <span>Check Your Understanding</span>
          </span>
          <span className="text-[10px] text-[#4A5168]">Instant Feedback</span>
        </div>

        <p className="text-xs sm:text-sm font-semibold text-[#1F2433]">
          {quickCheckQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {quickCheckQuestion.options.map((opt, oIdx) => {
            const isSelected = quickCheckAnswer === oIdx;
            const isCorrect = oIdx === quickCheckQuestion.correctIndex;
            let btnStyle = 'bg-white border-[#ECE8E1] text-[#1F2433] hover:border-[#4F46E5]/40';

            if (quickCheckSubmitted) {
              if (isCorrect) {
                btnStyle = 'bg-[#E4F6EA] border-[#16A34A] text-[#16A34A] font-bold';
              } else if (isSelected) {
                btnStyle = 'bg-[#FDECEC] border-[#DC2626] text-[#DC2626] font-semibold';
              } else {
                btnStyle = 'bg-white border-[#ECE8E1] text-[#4A5168] opacity-60';
              }
            }

            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => handleQuickCheckSelect(oIdx)}
                disabled={quickCheckSubmitted}
                className={`w-full text-left p-3 rounded-xl border text-xs leading-snug transition-all flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
              >
                <span className="font-mono font-bold text-[11px] shrink-0 mt-0.5">
                  {String.fromCharCode(65 + oIdx)}.
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback explanation after answer */}
        {quickCheckSubmitted && (
          <div
            className={`p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 ${
              quickCheckAnswer === quickCheckQuestion.correctIndex
                ? 'bg-[#E4F6EA] text-[#16A34A] border border-[#16A34A]/20'
                : 'bg-[#FDECEC] text-[#DC2626] border border-[#DC2626]/20'
            }`}
          >
            {quickCheckAnswer === quickCheckQuestion.correctIndex ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold mr-1">
                {quickCheckAnswer === quickCheckQuestion.correctIndex
                  ? 'Correct!'
                  : 'Not quite.'}
              </span>
              <span>{quickCheckQuestion.explanation}</span>
            </div>
          </div>
        )}
      </div>

      {/* 8. ASK TUTOR: Direct Contextual Tutor Trigger */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE8E1]/80">
        <div className="text-xs text-[#4A5168]">
          Have a question about <span className="font-semibold text-[#1F2433]">{concept.title}</span>?
        </div>
        <button
          type="button"
          onClick={() => onOpenTutorWithConcept(concept)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#7C3AED] border border-[#7C3AED]/20 text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask Tutor about this</span>
        </button>
      </div>
    </article>
  );
}

/**
 * Generate a concept-specific quick check question with immediate feedback
 */
function getConceptQuickCheck(concept, matchingCheck) {
  if (matchingCheck && matchingCheck.question) {
    let opts = matchingCheck.options;
    if (!opts || !Array.isArray(opts) || opts.length === 0) {
      if (matchingCheck.type === 'True-False' || /true or false/i.test(matchingCheck.question)) {
        opts = ['True', 'False'];
      } else if (matchingCheck.correct_answer) {
        opts = [matchingCheck.correct_answer, 'Alternative conjecture'];
      } else {
        opts = ['Yes', 'No'];
      }
    }
    let cIdx = matchingCheck.correct_option_index ?? 0;
    if (cIdx < 0 || cIdx >= opts.length) cIdx = 0;
    return {
      id: matchingCheck.id,
      question: matchingCheck.question,
      options: opts,
      correctIndex: cIdx,
      explanation: matchingCheck.explanation || matchingCheck.why_other_answers_are_wrong || matchingCheck.correct_answer || 'Verified in topic ground truth.'
    };
  }

  const id = concept.id || '';
  if (id === 'C02') {
    return {
      question: 'Which of the following describes a classical bit?',
      options: [
        'It has a definite value of either 0 or 1 at all times.',
        'It exists in a continuous linear superposition of states until measured.',
        'It can transmit information faster than light using quantum entanglement.'
      ],
      correctIndex: 0,
      explanation: 'A classical bit is strictly binary: it holds either 0 or 1 deterministically with no quantum superposition.'
    };
  }
  if (id === 'C03') {
    return {
      question: 'What is the mathematical condition for the amplitudes α and β of a valid qubit state |ψ⟩ = α|0⟩ + β|1⟩?',
      options: [
        'α + β = 1',
        '|α|² + |β|² = 1',
        'α · β = 0'
      ],
      correctIndex: 1,
      explanation: 'Normalization requires the sum of squared absolute amplitudes to equal 1 (|α|² + |β|² = 1), representing total probability 100%.'
    };
  }
  if (id === 'C04') {
    return {
      question: 'Does a qubit in superposition literally store both classical values 0 and 1 at the same time?',
      options: [
        'Yes, it acts as two full classical bits of information simultaneously.',
        'No, it is in a single linear combination of states described by probability amplitudes; measuring it yields only one definite outcome.',
        'Yes, which allows it to try every password in the universe at once.'
      ],
      correctIndex: 1,
      explanation: 'Superposition is a wave-like linear combination of basis states with complex amplitudes, not a dual classical storage mechanism.'
    };
  }
  if (id === 'C07') {
    return {
      question: 'What is the mathematical result of applying two Hadamard gates (H · H) consecutively to |0⟩?',
      options: [
        'It leaves the qubit in a 50/50 superposition.',
        'It deterministically returns the qubit to state |0⟩ due to interference.',
        'It flips the qubit into state |1⟩.'
      ],
      correctIndex: 1,
      explanation: 'Because H is Hermitian and unitary, H² = I. Destructive interference cancels the |1⟩ amplitude, returning the qubit to |0⟩.'
    };
  }
  if (id === 'C08') {
    return {
      question: 'Can quantum entanglement be used to transmit classical information faster than the speed of light?',
      options: [
        'Yes, instantaneous correlation transmits data faster than light.',
        'No, the no-communication theorem proves that entanglement cannot transmit messages without a classical channel.',
        'Only when using superconducting transmons.'
      ],
      correctIndex: 1,
      explanation: 'While measurement outcomes of entangled qubits are correlated instantly, no controllable data can be transmitted without classical communication.'
    };
  }

  // Default quick check derived from simple explanation
  return {
    question: `Which statement accurately summarizes ${concept.title}?`,
    options: [
      concept.simple_explanation,
      `It replaces classical computers completely for all everyday tasks like web browsing.`,
      `It allows unlimited parallel computation of all possible answers simultaneously.`
    ],
    correctIndex: 0,
    explanation: `${concept.simple_explanation}`
  };
}

/**
 * Determine concept-specific interactive quantum action connecting directly to Quantum Lab
 */
function getConceptInteractiveAction(concept) {
  const id = concept.id || '';
  const title = (concept.title || '').toLowerCase();
  const simple = (concept.simple_explanation || '').toLowerCase();
  const visual = (concept.visual_explanation || '').toLowerCase();
  const text = `${title} ${simple} ${visual}`.toLowerCase();

  // 1. Bloch Sphere concepts
  if (text.includes('bloch') || text.includes('sphere') || text.includes('geometric') || text.includes('phase')) {
    return {
      type: 'bloch',
      label: 'Explore on Bloch Sphere ↗',
      subtext: 'Inspect 3D unit sphere statevector & phase rotations in Quantum Lab',
      circuit: concept.circuit_example || {
        num_qubits: 1,
        operations: [{ gate: 'H', qubits: [0] }]
      },
      visualMode: 'bloch'
    };
  }

  // 2. Measurement / Born rule / Collapse
  if (title.includes('measurement') || text.includes('collapse') || text.includes('born rule') || id === 'C05') {
    return {
      type: 'measurement',
      label: 'Visualize Measurement ↗',
      subtext: 'Run 1,000 shots in Quantum Lab to witness probabilistic state collapse',
      circuit: concept.circuit_example || {
        num_qubits: 1,
        operations: [{ gate: 'H', qubits: [0] }]
      },
      visualMode: 'probabilities'
    };
  }

  // 3. Gates / Circuits / Bell State / Entanglement
  if (title.includes('gate') || title.includes('hadamard') || title.includes('cnot') || title.includes('entangle') || title.includes('circuit') || id === 'C07' || id === 'C08' || concept.circuit_example) {
    const isBell = title.includes('entangle') || id === 'C08';
    return {
      type: 'circuit',
      label: 'Build This Circuit ↗',
      subtext: isBell ? 'Preloads 2-qubit Bell State on the Quantum Lab composer' : 'Preloads quantum gate onto register wire in Quantum Lab',
      circuit: concept.circuit_example || (isBell ? {
        num_qubits: 2,
        operations: [{ gate: 'H', qubits: [0] }, { gate: 'CNOT', qubits: [0, 1] }]
      } : {
        num_qubits: 1,
        operations: [{ gate: 'H', qubits: [0] }]
      }),
      visualMode: 'both'
    };
  }

  // 4. Qubit / Superposition / General
  return {
    type: 'qubit',
    label: 'Try This in Quantum Lab ↗',
    subtext: 'Simulate statevectors with verified NumPy mathematics in Quantum Lab',
    circuit: concept.circuit_example || {
      num_qubits: 1,
      operations: [{ gate: 'H', qubits: [0] }]
    },
    visualMode: 'both'
  };
}

