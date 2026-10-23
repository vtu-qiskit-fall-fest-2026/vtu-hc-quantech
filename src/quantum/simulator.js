/**
 * QuantaLearn AI — In-Browser Client-Side Quantum Simulator
 * Exact Complex Arithmetic, Arbitrary N-Qubit Statevector Engine,
 * Analytical Partial Tracing, Bloch Coordinates & Purity Calculation.
 */

// Complex number class: z = a + bi
export class Complex {
  constructor(re = 0, im = 0) {
    this.re = Number(re) || 0;
    this.im = Number(im) || 0;
  }

  static from(re, im = 0) {
    return new Complex(re, im);
  }

  add(other) {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other) {
    if (typeof other === 'number') {
      return new Complex(this.re * other, this.im * other);
    }
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  div(other) {
    if (typeof other === 'number') {
      return new Complex(this.re / other, this.im / other);
    }
    const denom = other.re * other.re + other.im * other.im;
    if (denom === 0) return new Complex(0, 0);
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom
    );
  }

  conj() {
    return new Complex(this.re, -this.im);
  }

  abs() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }

  absSq() {
    return this.re * this.re + this.im * this.im;
  }

  arg() {
    return Math.atan2(this.im, this.re);
  }

  clone() {
    return new Complex(this.re, this.im);
  }
}

const INV_SQRT2 = 1 / Math.SQRT2;

// Standard Unitary 2x2 Matrices
export const GATES = {
  I: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(1, 0)]
  ],
  X: [
    [new Complex(0, 0), new Complex(1, 0)],
    [new Complex(1, 0), new Complex(0, 0)]
  ],
  Y: [
    [new Complex(0, 0), new Complex(0, -1)],
    [new Complex(0, 1), new Complex(0, 0)]
  ],
  Z: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(-1, 0)]
  ],
  H: [
    [new Complex(INV_SQRT2, 0), new Complex(INV_SQRT2, 0)],
    [new Complex(INV_SQRT2, 0), new Complex(-INV_SQRT2, 0)]
  ],
  S: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, 1)]
  ],
  T: [
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(INV_SQRT2, INV_SQRT2)]
  ]
};

// Parameterized rotation gates
export function createRy(theta) {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [new Complex(c, 0), new Complex(-s, 0)],
    [new Complex(s, 0), new Complex(c, 0)]
  ];
}

export function createRz(phi) {
  const c1 = Math.cos(-phi / 2);
  const s1 = Math.sin(-phi / 2);
  const c2 = Math.cos(phi / 2);
  const s2 = Math.sin(phi / 2);
  return [
    [new Complex(c1, s1), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(c2, s2)]
  ];
}

/**
 * Initializes a pure basis state |00...0> for N qubits.
 */
export function initializeState(numQubits) {
  const dim = 1 << numQubits;
  const state = new Array(dim);
  for (let i = 0; i < dim; i++) {
    state[i] = new Complex(i === 0 ? 1 : 0, 0);
  }
  return state;
}

/**
 * Applies a 1-qubit gate matrix to target qubit in an N-qubit statevector.
 */
export function applySingleQubitGate(state, numQubits, targetQubit, matrix) {
  const dim = 1 << numQubits;
  const next = new Array(dim);
  const step = 1 << (numQubits - 1 - targetQubit);

  for (let i = 0; i < dim; i++) {
    next[i] = new Complex(0, 0);
  }

  for (let i = 0; i < dim; i++) {
    // Determine bit value at targetQubit
    if ((i & step) === 0) {
      const idx0 = i;
      const idx1 = i | step;
      const psi0 = state[idx0];
      const psi1 = state[idx1];

      // [psi0'] = M00*psi0 + M01*psi1
      // [psi1'] = M10*psi0 + M11*psi1
      const res0 = matrix[0][0].mul(psi0).add(matrix[0][1].mul(psi1));
      const res1 = matrix[1][0].mul(psi0).add(matrix[1][1].mul(psi1));

      next[idx0] = res0;
      next[idx1] = res1;
    }
  }

  return next;
}

/**
 * Applies a 2-qubit CNOT gate.
 */
export function applyCNOT(state, numQubits, controlQubit, targetQubit) {
  const dim = 1 << numQubits;
  const next = state.map(c => c.clone());
  const ctrlMask = 1 << (numQubits - 1 - controlQubit);
  const tgtMask = 1 << (numQubits - 1 - targetQubit);

  for (let i = 0; i < dim; i++) {
    // If control bit is 1 and target bit is 0, swap amplitude with state where target is 1
    if ((i & ctrlMask) !== 0 && (i & tgtMask) === 0) {
      const j = i | tgtMask;
      const temp = next[i];
      next[i] = next[j];
      next[j] = temp;
    }
  }

  return next;
}

/**
 * Applies a 2-qubit Controlled-Z (CZ) gate.
 */
export function applyCZ(state, numQubits, controlQubit, targetQubit) {
  const dim = 1 << numQubits;
  const next = state.map(c => c.clone());
  const ctrlMask = 1 << (numQubits - 1 - controlQubit);
  const tgtMask = 1 << (numQubits - 1 - targetQubit);

  for (let i = 0; i < dim; i++) {
    if ((i & ctrlMask) !== 0 && (i & tgtMask) !== 0) {
      next[i] = next[i].mul(-1);
    }
  }

  return next;
}

/**
 * Applies a 2-qubit SWAP gate.
 */
export function applySWAP(state, numQubits, q1, q2) {
  const dim = 1 << numQubits;
  const next = state.map(c => c.clone());
  const mask1 = 1 << (numQubits - 1 - q1);
  const mask2 = 1 << (numQubits - 1 - q2);

  for (let i = 0; i < dim; i++) {
    const bit1 = (i & mask1) !== 0;
    const bit2 = (i & mask2) !== 0;
    if (bit1 && !bit2) {
      const swapped = (i ^ mask1) | mask2;
      const temp = next[i];
      next[i] = next[swapped];
      next[swapped] = temp;
    }
  }

  return next;
}

/**
 * Executes a full quantum circuit and returns full telemetry.
 */
export function simulateCircuit(numQubits, operations = []) {
  let state = initializeState(numQubits);

  for (const op of operations) {
    const gate = (op.gate || op.type || '').toUpperCase();
    const qubits = op.qubits || [op.target];

    if (['H', 'X', 'Y', 'Z', 'S', 'T'].includes(gate)) {
      state = applySingleQubitGate(state, numQubits, qubits[0], GATES[gate]);
    } else if (gate === 'RY') {
      const theta = op.theta !== undefined ? op.theta : Math.PI / 4;
      state = applySingleQubitGate(state, numQubits, qubits[0], createRy(theta));
    } else if (gate === 'RZ') {
      const phi = op.phi !== undefined ? op.phi : Math.PI / 4;
      state = applySingleQubitGate(state, numQubits, qubits[0], createRz(phi));
    } else if (gate === 'CNOT' || gate === 'CX') {
      state = applyCNOT(state, numQubits, qubits[0], qubits[1]);
    } else if (gate === 'CZ') {
      state = applyCZ(state, numQubits, qubits[0], qubits[1]);
    } else if (gate === 'SWAP') {
      state = applySWAP(state, numQubits, qubits[0], qubits[1]);
    }
  }

  // Calculate probabilities
  const dim = 1 << numQubits;
  const probabilities = {};
  for (let i = 0; i < dim; i++) {
    const bitstring = i.toString(2).padStart(numQubits, '0');
    probabilities[bitstring] = state[i].absSq();
  }

  // Per-qubit telemetry via analytical partial trace
  const qubitTelemetry = [];
  for (let q = 0; q < numQubits; q++) {
    const pt = computePartialTrace(state, numQubits, q);
    qubitTelemetry.push({
      qubit: q,
      ...pt
    });
  }

  const isEntangled = qubitTelemetry.some(t => t.purity < 0.99);

  return {
    num_qubits: numQubits,
    dim,
    statevector: state.map(c => ({ re: c.re, im: c.im })),
    probabilities,
    qubits: qubitTelemetry,
    entangled: isEntangled,
    pure: !isEntangled
  };
}

/**
 * Analytical partial trace over all qubits except target qubit `q`.
 * Computes 2x2 reduced density matrix rho, purity, Bloch coordinates (x,y,z), and polar angles (theta, phi).
 */
export function computePartialTrace(state, numQubits, targetQubit) {
  const dim = 1 << numQubits;
  const mask = 1 << (numQubits - 1 - targetQubit);

  let rho00 = new Complex(0, 0);
  let rho01 = new Complex(0, 0);
  let rho10 = new Complex(0, 0);
  let rho11 = new Complex(0, 0);

  for (let i = 0; i < dim; i++) {
    if ((i & mask) === 0) {
      const idx0 = i;
      const idx1 = i | mask;

      const c0 = state[idx0];
      const c1 = state[idx1];

      // rho00 += c0 * conj(c0)
      rho00 = rho00.add(new Complex(c0.absSq(), 0));
      // rho01 += c0 * conj(c1)
      rho01 = rho01.add(c0.mul(c1.conj()));
      // rho10 += c1 * conj(c0)
      rho10 = rho10.add(c1.mul(c0.conj()));
      // rho11 += c1 * conj(c1)
      rho11 = rho11.add(new Complex(c1.absSq(), 0));
    }
  }

  // Purity gamma = Tr(rho^2) = rho00^2 + rho11^2 + 2 * |rho01|^2
  const purity = (rho00.re * rho00.re) + (rho11.re * rho11.re) + 2 * rho01.absSq();

  // Bloch vector components:
  // x = 2 * Re(rho01)
  // y = 2 * Im(rho10) = -2 * Im(rho01)
  // z = rho00 - rho11
  const x = 2 * rho01.re;
  const y = -2 * rho01.im;
  const z = rho00.re - rho11.re;
  const r = Math.sqrt(x * x + y * y + z * z);

  // Polar angles theta, phi
  const theta = Math.acos(Math.max(-1, Math.min(1, z / (r || 1))));
  const phi = Math.atan2(y, x);

  return {
    rho: [
      [{ re: rho00.re, im: rho00.im }, { re: rho01.re, im: rho01.im }],
      [{ re: rho10.re, im: rho10.im }, { re: rho11.re, im: rho11.im }]
    ],
    purity: Math.min(1.0, Math.max(0.0, purity)),
    bloch: { x, y, z, r },
    theta,
    phi,
    isMixed: purity < 0.99
  };
}

/**
 * 1024-shot Monte Carlo Born Rule Sampler with optional Lindblad error noise.
 */
export function sampleMeasurements(probabilities, shots = 1024, errorRate = 0.0) {
  const outcomes = Object.keys(probabilities);
  const counts = {};
  outcomes.forEach(o => { counts[o] = 0; });

  for (let s = 0; s < shots; s++) {
    const rand = Math.random();
    let cumulative = 0;
    let selected = outcomes[0];

    for (const outcome of outcomes) {
      cumulative += probabilities[outcome];
      if (rand <= cumulative) {
        selected = outcome;
        break;
      }
    }

    // Apply Lindblad depolarizing noise if requested
    if (errorRate > 0 && Math.random() < errorRate) {
      const randomIdx = Math.floor(Math.random() * outcomes.length);
      selected = outcomes[randomIdx];
    }

    counts[selected] = (counts[selected] || 0) + 1;
  }

  const frequencies = {};
  for (const k in counts) {
    frequencies[k] = counts[k] / shots;
  }

  return { shots, counts, frequencies };
}
