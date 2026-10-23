/**
 * QuantaLearn AI — NISQ Hardware Digital Twin
 * Simulates Lindblad Master Equation T1 Energy Relaxation and T2 Dephasing
 * for IBM Superconducting Transmon Qubits.
 * Implements CPMG and XY-4 AI Dynamical Decoupling (DD) Pulse Sequences.
 */

export const DEFAULT_TRANSMON_PARAMS = {
  name: 'IBM Eagle Transmon Qubit',
  t1_us: 125.0,        // T1 relaxation time in microseconds
  t2_us: 85.0,         // T2 dephasing time in microseconds
  singleGateTime_ns: 35, // Single-qubit gate duration
  twoQubitGateTime_ns: 280, // CNOT duration
  readoutError: 0.015  // 1.5% measurement fidelity infidelity
};

/**
 * Calculates theoretical coherence retention after elapsed execution time.
 * @param {number} time_ns - Elapsed circuit duration in nanoseconds
 * @param {string} ddSequence - 'none', 'cpmg', or 'xy4'
 * @param {object} params - Transmon hardware parameters
 */
export function calculateCoherenceRetention(time_ns, ddSequence = 'none', params = DEFAULT_TRANSMON_PARAMS) {
  const t_us = time_ns / 1000.0;
  let effectiveT2 = params.t2_us;

  // Dynamical decoupling extends effective T2 by refocusing low-frequency noise
  if (ddSequence === 'cpmg') {
    effectiveT2 = params.t2_us * 1.85; // ~1.85x coherence extension
  } else if (ddSequence === 'xy4') {
    effectiveT2 = params.t2_us * 2.40; // ~2.4x extension via robust 4-phase cancellation
  }

  // Lindblad exponential decay:
  // T1 population decay: P_excited(t) = exp(-t / T1)
  // T2 coherence envelope: exp(-t / T2)
  const t1_retention = Math.exp(-t_us / params.t1_us);
  const t2_retention = Math.exp(-t_us / effectiveT2);

  // Overall quantum state fidelity proxy
  const quantumFidelity = 0.5 * (t1_retention + t2_retention);

  return {
    time_us: t_us,
    t1_retention: Math.max(0, Math.min(1.0, t1_retention)),
    t2_retention: Math.max(0, Math.min(1.0, t2_retention)),
    quantumFidelity: Math.max(0, Math.min(1.0, quantumFidelity)),
    effectiveT2_us: effectiveT2
  };
}

/**
 * Computes time-series decoherence decay curve over 0 to 300 microseconds.
 */
export function generateDecayCurve(ddSequence = 'none', params = DEFAULT_TRANSMON_PARAMS, steps = 30) {
  const points = [];
  const maxTime_us = 300;

  for (let i = 0; i <= steps; i++) {
    const t_us = (i / steps) * maxTime_us;
    const res = calculateCoherenceRetention(t_us * 1000, ddSequence, params);
    points.push({
      time_us: t_us,
      fidelity: res.quantumFidelity,
      t1: res.t1_retention,
      t2: res.t2_retention
    });
  }

  return points;
}

/**
 * Computes total circuit physical runtime on superconducting hardware.
 */
export function estimateCircuitDuration(circuit, params = DEFAULT_TRANSMON_PARAMS) {
  const ops = circuit.operations || [];
  let totalNs = 0;

  for (const op of ops) {
    const q = op.qubits || [op.target];
    if (q.length > 1) {
      totalNs += params.twoQubitGateTime_ns;
    } else {
      totalNs += params.singleGateTime_ns;
    }
  }

  return {
    totalDuration_ns: totalNs,
    totalDuration_us: totalNs / 1000.0,
    totalGates: ops.length
  };
}
