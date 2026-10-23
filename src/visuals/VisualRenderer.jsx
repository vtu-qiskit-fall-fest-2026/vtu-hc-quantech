import React from 'react';
import BitVsQubit from './BitVsQubit';
import ProbabilityBars from './ProbabilityBars';
import CircuitDiagram from './CircuitDiagram';
import StateStepper from './StateStepper';
import FlowDiagram from './FlowDiagram';

/**
 * Data-Driven Visual Renderer.
 * Determines the visual type from concept metadata, explicit visual props, or concept ID.
 * Follows the requirement: "Do NOT create topic-specific visual components.
 * Build a reusable DATA-DRIVEN visual component system."
 */
export default function VisualRenderer({ concept, telemetry = null }) {
  if (!concept) return null;

  const conceptId = concept.id || '';
  const title = concept.title || '';
  const visualType = concept.visual_type || inferVisualType(concept);

  // If live simulator telemetry is provided, prioritize verified probability bars
  if (telemetry && telemetry.probabilities) {
    return (
      <ProbabilityBars
        probabilities={telemetry.probabilities}
        caption={`Live output from quantum simulator (${telemetry.num_qubits} qubits, ${telemetry.applied_gates?.length || 0} gates).`}
        altText="Live simulation probability bar chart computed from simulator statevector"
        explanation={telemetry.explanation || "Probabilities computed directly from statevector amplitudes squared."}
        isSimulatorDerived={true}
      />
    );
  }

  // Visual type routing based on reusable data
  switch (visualType) {
    case 'bit_vs_qubit':
      return (
        <BitVsQubit
          caption={concept.visual_explanation || "A classical bit is strictly 0 or 1; a qubit exists as a continuum of amplitudes until measurement."}
          altText={`Comparison diagram for ${title}`}
          explanation={concept.visual_explanation}
        />
      );

    case 'circuit_diagram': {
      const circuit = concept.circuit_example || {
        num_qubits: 2,
        operations: [{ gate: 'H', qubits: [0] }, { gate: 'CNOT', qubits: [0, 1] }]
      };
      return (
        <CircuitDiagram
          circuit={circuit}
          caption={concept.visual_explanation || "Circuit diagram showing quantum gates on register wires."}
          altText={`Quantum circuit diagram for ${title}`}
          explanation={concept.visual_explanation}
        />
      );
    }

    case 'state_stepper':
      return (
        <StateStepper
          steps={concept.stepper_steps || [
            {
              label: 'Initial Ground State',
              gate: 'Init',
              stateMath: '|0⟩',
              amplitudes: { '0': 1.0, '1': 0.0 },
              description: 'Register initialized to computational ground state |0⟩.'
            },
            {
              label: 'Apply Hadamard Gate (H)',
              gate: 'H',
              stateMath: '(|0⟩ + |1⟩)/√2',
              amplitudes: { '0': 0.5, '1': 0.5 },
              description: 'Superposition created: 50% chance of measuring 0, 50% chance of measuring 1.'
            },
            {
              label: 'Second Hadamard Gate (H)',
              gate: 'H',
              stateMath: '|0⟩',
              amplitudes: { '0': 1.0, '1': 0.0 },
              description: 'Constructive interference on |0⟩ and destructive interference on |1⟩ returns state to |0⟩.'
            }
          ]}
          caption={concept.visual_explanation || "Step-by-step evolution of the quantum state."}
          altText={`Step-by-step state transformation for ${title}`}
          explanation={concept.visual_explanation}
        />
      );

    case 'probability_bars': {
      // Data-driven probabilities from concept metadata, circuit example, or fallback
      const probs = concept.visual_data?.probabilities ||
                    concept.circuit_example?.expected_probabilities ||
                    concept.probabilities ||
                    { '0': 0.5, '1': 0.5 };

      return (
        <ProbabilityBars
          probabilities={probs}
          caption={concept.visual_explanation || "Probability distribution across basis states."}
          altText={`Probability distribution bar chart for ${title}`}
          explanation={concept.visual_explanation}
        />
      );
    }

    case 'flow_diagram': {
      const nodes = getFlowNodesForConcept(concept);
      return (
        <FlowDiagram
          nodes={nodes}
          title={title}
          caption={concept.visual_explanation || "Workflow diagram."}
          altText={`Workflow diagram for ${title}`}
          explanation={concept.visual_explanation}
        />
      );
    }

    default:
      return (
        <FlowDiagram
          title={title}
          caption={concept.visual_explanation}
          altText={`Visual for ${title}`}
          explanation={concept.visual_explanation}
        />
      );
  }
}

/**
 * Infer the best reusable visual type based on concept contents
 */
function inferVisualType(concept) {
  const id = concept.id || '';
  const text = (concept.title + ' ' + (concept.simple_explanation || '')).toLowerCase();

  if (concept.circuit_example || id === 'C09') {
    return 'circuit_diagram';
  }
  if (id === 'C02' || id === 'C03' || text.includes('bit vs') || text.includes('what is a qubit')) {
    return 'bit_vs_qubit';
  }
  if (id === 'C07' || text.includes('interference') || text.includes('step')) {
    return 'state_stepper';
  }
  if (id === 'C04' || id === 'C05' || id === 'C06' || id === 'C08' || text.includes('probability') || text.includes('amplitudes') || text.includes('superposition')) {
    return 'probability_bars';
  }
  return 'flow_diagram';
}

/**
 * Generate data-driven flow nodes for workflow concepts
 */
function getFlowNodesForConcept(concept) {
  const id = concept.id || '';
  if (id === 'C10') {
    // Decoherence
    return [
      { id: '1', title: '1. Coherent State', desc: 'Isolated quantum superposition', color: 'indigo' },
      { id: '2', title: '2. Noise Coupling', desc: 'Thermal & magnetic fluctuations', color: 'amber' },
      { id: '3', title: '3. Phase Jitter', desc: 'Amplitudes lose phase coherence', color: 'coral' },
      { id: '4', title: '4. Classical Mix', desc: 'Incoherent mixture of states', color: 'green' }
    ];
  }
  if (id === 'C11') {
    // NISQ
    return [
      { id: '1', title: '1. 50-1000 Qubits', desc: 'Physical imperfect hardware', color: 'indigo' },
      { id: '2', title: '2. No FTQC', desc: 'Lacks full fault-tolerant correction', color: 'coral' },
      { id: '3', title: '3. Mitigation', desc: 'Zero-noise extrapolation & readout tweaks', color: 'amber' },
      { id: '4', title: '4. Near-Term Apps', desc: 'VQE, QAOA, quantum simulation', color: 'teal' }
    ];
  }
  if (id === 'C12') {
    // Speedup
    return [
      { id: '1', title: '1. Problem Type', desc: 'Matrix inversion, simulation, factoring', color: 'indigo' },
      { id: '2', title: '2. Interference', desc: 'Algorithmic phase manipulation', color: 'teal' },
      { id: '3', title: '3. Specialized Win', desc: 'Super-polynomial runtime advantage', color: 'green' },
      { id: '4', title: '4. Classical Rest', desc: 'Everyday computing stays classical', color: 'amber' }
    ];
  }
  if (id === 'C13') {
    // Hybrid computing
    return [
      { id: '1', title: '1. Classical CPU', desc: 'Selects parameter angles θ', color: 'indigo' },
      { id: '2', title: '2. Quantum QPU', desc: 'Executes parameterized circuit U(θ)', color: 'teal' },
      { id: '3', title: '3. Readout', desc: 'Estimates energy expectation value', color: 'amber' },
      { id: '4', title: '4. Optimizer', desc: 'Classical gradient updates θ iteratively', color: 'green' }
    ];
  }
  if (id === 'C14') {
    // Qubit Tech
    return [
      { id: '1', title: 'Superconducting', desc: 'Transmon circuits at millikelvin temps', color: 'indigo' },
      { id: '2', title: 'Trapped Ions', desc: 'Charged atoms manipulated by lasers', color: 'teal' },
      { id: '3', title: 'Neutral Atoms', desc: 'Rydberg atom arrays in optical tweezers', color: 'amber' },
      { id: '4', title: 'Photonics', desc: 'Single photons running on optical waveguides', color: 'coral' }
    ];
  }
  // Default computational flow
  return [
    { id: '1', title: '1. Initialize', desc: 'All qubits set to |0⟩', color: 'indigo' },
    { id: '2', title: '2. Quantum Gates', desc: 'Create superposition & entanglement', color: 'teal' },
    { id: '3', title: '3. Interference', desc: 'Desired answers amplify; errors cancel', color: 'amber' },
    { id: '4', title: '4. Measurement', desc: 'Collapses to classical output bitstring', color: 'coral' }
  ];
}
