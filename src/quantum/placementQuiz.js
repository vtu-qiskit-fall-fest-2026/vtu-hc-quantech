/**
 * QuantaLearn AI — Adaptive Placement Engine & Diagnostic Assessment.
 * Evaluates learner background and answers to assign personalized curriculum level and UI density.
 */

export const PLACEMENT_QUESTIONS = [
  {
    id: 'pq_1',
    question: 'What is the primary difference between a classical bit and a quantum bit (qubit)?',
    options: [
      { id: 'opt_1a', text: 'A qubit can exist in a superposition of |0⟩ and |1⟩ before measurement.', correct: true },
      { id: 'opt_1b', text: 'A qubit always processes data 1,000,000 times faster than a bit.', correct: false },
      { id: 'opt_1c', text: 'A qubit stores two independent classical bits simultaneously.', correct: false },
      { id: 'opt_1d', text: 'A qubit does not require physical hardware to manipulate.', correct: false }
    ],
    explanation: 'A qubit is defined by complex amplitudes in the state |ψ⟩ = α|0⟩ + β|1⟩, allowing superposition, whereas a classical bit is strictly 0 or 1.'
  },
  {
    id: 'pq_2',
    question: 'What mathematical property must the statevector amplitudes α and β satisfy for a normalized single qubit?',
    options: [
      { id: 'opt_2a', text: 'α + β = 1', correct: false },
      { id: 'opt_2b', text: '|α|² + |β|² = 1', correct: true },
      { id: 'opt_2c', text: 'α × β = 0', correct: false },
      { id: 'opt_2d', text: '|α| + |β| = 2', correct: false }
    ],
    explanation: 'By the Born rule, probabilities must sum to 100%, requiring the sum of the squared magnitudes |α|² + |β|² = 1.'
  },
  {
    id: 'pq_3',
    question: 'Applying a Hadamard (H) gate to the ground state |0⟩ produces which state?',
    options: [
      { id: 'opt_3a', text: '|1⟩', correct: false },
      { id: 'opt_3b', text: '(|0⟩ + |1⟩) / √2', correct: true },
      { id: 'opt_3c', text: '(|0⟩ - |1⟩) / √2', correct: false },
      { id: 'opt_3d', text: '|00⟩', correct: false }
    ],
    explanation: 'The Hadamard gate creates an equal superposition: H|0⟩ = |+⟩ = (|0⟩ + |1⟩)/√2.'
  },
  {
    id: 'pq_4',
    question: 'Which of the following describes the effect of a CNOT gate on two qubits?',
    options: [
      { id: 'opt_4a', text: 'Flips target qubit if control qubit is |1⟩.', correct: true },
      { id: 'opt_4b', text: 'Flips both qubits unconditionally.', correct: false },
      { id: 'opt_4c', text: 'Measures both qubits simultaneously.', correct: false },
      { id: 'opt_4d', text: 'Transmits a message faster than light.', correct: false }
    ],
    explanation: 'Controlled-NOT (CNOT) performs an X gate on the target qubit if and only if the control qubit is in state |1⟩.'
  },
  {
    id: 'pq_5',
    question: 'In the Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2, what is the probability of measuring outcome 01?',
    options: [
      { id: 'opt_5a', text: '50%', correct: false },
      { id: 'opt_5b', text: '25%', correct: false },
      { id: 'opt_5c', text: '0%', correct: true },
      { id: 'opt_5d', text: '100%', correct: false }
    ],
    explanation: 'The amplitude for basis states |01⟩ and |10⟩ is strictly zero, meaning they will never be observed in an ideal noiseless readout.'
  },
  {
    id: 'pq_6',
    question: 'What is the matrix dimension of a unitary transformation acting on a 3-qubit register?',
    options: [
      { id: 'opt_6a', text: '3 × 3', correct: false },
      { id: 'opt_6b', text: '6 × 6', correct: false },
      { id: 'opt_6d', text: '8 × 8', correct: true },
      { id: 'opt_6c', text: '9 × 9', correct: false }
    ],
    explanation: 'An n-qubit quantum state space has dimension 2ⁿ. For n=3, 2³ = 8, so the unitary matrix is 8 × 8.'
  },
  {
    id: 'pq_7',
    question: 'What does the term NISQ stand for in modern quantum computing?',
    options: [
      { id: 'opt_7a', text: 'Noisy Intermediate-Scale Quantum', correct: true },
      { id: 'opt_7b', text: 'Non-Interference Standard Qubit', correct: false },
      { id: 'opt_7c', text: 'Native Integrated Silicon Quantum', correct: false },
      { id: 'opt_7d', text: 'Networked Instruction Set Quantum', correct: false }
    ],
    explanation: 'NISQ was coined by John Preskill to describe the current era of 50-1000 noisy physical qubits without full fault tolerance.'
  },
  {
    id: 'pq_8',
    question: 'Can quantum entanglement be utilized to send data across the universe faster than the speed of light?',
    options: [
      { id: 'opt_8a', text: 'Yes, because measurement collapse is instantaneous.', correct: false },
      { id: 'opt_8b', text: 'No, due to the no-communication theorem.', correct: true },
      { id: 'opt_8c', text: 'Yes, but only in superconducting circuits.', correct: false },
      { id: 'opt_8d', text: 'Only when using 3 or more qubits in a GHZ state.', correct: false }
    ],
    explanation: 'The quantum no-communication theorem proves that entanglement cannot transmit classical information without a classical sub-light communication channel.'
  }
];

export const ROLE_OPTIONS = [
  { id: 'school_student', label: 'School Student (K-12)', defaultLevel: 'beginner' },
  { id: 'undergraduate', label: 'Undergraduate Student', defaultLevel: 'intermediate' },
  { id: 'postgraduate', label: 'Postgraduate / Master\'s', defaultLevel: 'intermediate' },
  { id: 'phd_researcher', label: 'PhD / Researcher', defaultLevel: 'master' },
  { id: 'faculty', label: 'Faculty / Professor', defaultLevel: 'master' },
  { id: 'industry_engineer', label: 'Industry Software Engineer', defaultLevel: 'intermediate' },
  { id: 'other_professional', label: 'Other Professional / Self-Learner', defaultLevel: 'beginner' }
];

export const MATH_BACKGROUND_OPTIONS = [
  { id: 'foundational', label: 'Foundational Arithmetic & Algebra' },
  { id: 'linear_algebra', label: 'Vectors, Matrices & Linear Algebra' },
  { id: 'calculus_diff_eq', label: 'Multivariable Calculus & Complex Numbers' },
  { id: 'advanced_math', label: 'Advanced Functional Analysis & Hilbert Spaces' }
];

export const QUANTUM_BACKGROUND_OPTIONS = [
  { id: 'none', label: 'No Prior Exposure' },
  { id: 'curious', label: 'Read Articles / Popular Science' },
  { id: 'introductory', label: 'Took an Intro Online Course / Read Textbook' },
  { id: 'intermediate', label: 'Written Circuits in Qiskit / Cirq' },
  { id: 'advanced', label: 'Conducting Research / Building Algorithms' }
];

export const LEVEL_DEFINITIONS = {
  beginner: {
    id: 'beginner',
    title: 'Beginner (Intuition-First)',
    description: 'Visual analogies, physical intuition, Bloch sphere walkthroughs, and step-by-step guidance.',
    densityMode: 'comfortable',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  intermediate: {
    id: 'intermediate',
    title: 'Intermediate (Formal & Applied)',
    description: 'Bra-ket Dirac notation, matrix multiplication, statevectors, and circuit synthesis.',
    densityMode: 'compact',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  master: {
    id: 'master',
    title: 'Master (Research & Telemetry Console)',
    description: 'Density matrices, entanglement entropy, operator algebras, and raw Float64 statevectors.',
    densityMode: 'dense',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  }
};

/**
 * Calculates adaptive placement level based on quiz score and user background.
 */
export function calculatePlacementLevel({
  role = 'undergraduate',
  mathBackground = 'foundational',
  quantumBackground = 'none',
  quizAnswers = {}
} = {}) {
  let score = 0;

  PLACEMENT_QUESTIONS.forEach(q => {
    const selectedOptId = quizAnswers[q.id];
    const correctOpt = q.options.find(o => o.correct);
    if (selectedOptId && correctOpt && selectedOptId === correctOpt.id) {
      score++;
    }
  });

  // Calculate composite calibration
  let level = 'beginner';
  let densityMode = 'comfortable';

  if (score >= 7 || (score >= 5 && (role === 'phd_researcher' || role === 'faculty' || mathBackground === 'advanced_math'))) {
    level = 'master';
    densityMode = 'dense';
  } else if (
    score >= 3 ||
    role === 'undergraduate' ||
    role === 'postgraduate' ||
    role === 'industry_engineer' ||
    mathBackground === 'linear_algebra' ||
    mathBackground === 'calculus_diff_eq' ||
    quantumBackground === 'introductory' ||
    quantumBackground === 'intermediate'
  ) {
    // If novice school student scored 0-2, stay beginner
    if (role === 'school_student' && score < 3) {
      level = 'beginner';
      densityMode = 'comfortable';
    } else {
      level = 'intermediate';
      densityMode = 'compact';
    }
  }

  return {
    level,
    densityMode,
    score,
    totalQuestions: PLACEMENT_QUESTIONS.length,
    percentage: Math.round((score / PLACEMENT_QUESTIONS.length) * 100),
    levelDefinition: LEVEL_DEFINITIONS[level]
  };
}
