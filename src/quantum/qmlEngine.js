/**
 * QuantaLearn AI — In-Browser Quantum Machine Learning Engine (QSVM)
 * Evaluates Quantum Kernel Gram Matrix K(x_i, x_j) = |<0| U†(x_i) U(x_j) |0>|²
 * using non-linear ZZ-Feature Maps in 4-dimensional Hilbert Space.
 * Includes Dual-Quadratic SVM Solver and Qiskit QSVC Transpilation.
 */

import { Complex, GATES, applySingleQubitGate, applyCNOT, createRz, initializeState } from './simulator.js';

/**
 * 2-Qubit ZZ Feature Map unitary state generator.
 * Encodes 2D classical feature vector x = [x0, x1] into 4D quantum state.
 *
 * Circuit layout:
 * |0> --- H --- Rz(2*x0) --- ● ------------- ● --- H --- Rz(2*x0) ---
 *                            |             |
 * |0> --- H --- Rz(2*x1) --- ⊕ --- Rz(2*(pi-x0)*(pi-x1)) --- ⊕ --- H --- Rz(2*x1) ---
 */
export function encodeZzFeatureMap(x) {
  const x0 = x[0];
  const x1 = x[1];
  const phi01 = 2 * (Math.PI - x0) * (Math.PI - x1);

  let state = initializeState(2);

  // 1. Initial Hadamards
  state = applySingleQubitGate(state, 2, 0, GATES.H);
  state = applySingleQubitGate(state, 2, 1, GATES.H);

  // 2. Local rotations Rz(2*x0), Rz(2*x1)
  state = applySingleQubitGate(state, 2, 0, createRz(2 * x0));
  state = applySingleQubitGate(state, 2, 1, createRz(2 * x1));

  // 3. Entangling ZZ-interaction via CNOT + Rz + CNOT
  state = applyCNOT(state, 2, 0, 1);
  state = applySingleQubitGate(state, 2, 1, createRz(phi01));
  state = applyCNOT(state, 2, 0, 1);

  // Repeat for 2nd layer to ensure non-linear separation
  state = applySingleQubitGate(state, 2, 0, GATES.H);
  state = applySingleQubitGate(state, 2, 1, GATES.H);
  state = applySingleQubitGate(state, 2, 0, createRz(2 * x0));
  state = applySingleQubitGate(state, 2, 1, createRz(2 * x1));
  state = applyCNOT(state, 2, 0, 1);
  state = applySingleQubitGate(state, 2, 1, createRz(phi01));
  state = applyCNOT(state, 2, 0, 1);

  return state;
}

/**
 * Computes quantum state transition fidelity |<psi(x_i) | psi(x_j)>|²
 */
export function computeQuantumKernel(xi, xj) {
  const stateI = encodeZzFeatureMap(xi);
  const stateJ = encodeZzFeatureMap(xj);

  // Inner product <stateI | stateJ> = sum conj(stateI[k]) * stateJ[k]
  let inner = new Complex(0, 0);
  for (let k = 0; k < stateI.length; k++) {
    inner = inner.add(stateI[k].conj().mul(stateJ[k]));
  }

  const fidelity = inner.absSq();
  return Math.max(0, Math.min(1, fidelity));
}

/**
 * Computes N x N Quantum Kernel Gram Matrix.
 */
export function computeGramMatrix(dataset) {
  const n = dataset.length;
  const gram = Array.from({ length: n }, () => new Float32Array(n));

  for (let i = 0; i < n; i++) {
    gram[i][i] = 1.0;
    for (let j = i + 1; j < n; j++) {
      const k = computeQuantumKernel(dataset[i].x, dataset[j].x);
      gram[i][j] = k;
      gram[j][i] = k;
    }
  }

  return gram;
}

/**
 * Simplified Sequential Minimal Optimization (SMO) style quadratic solver for SVM dual weights.
 * max sum(alpha) - 0.5 * sum(alpha_i * alpha_j * y_i * y_j * K_ij)
 */
export function trainQSVM(dataset, gramMatrix, C = 1.0, maxIters = 60) {
  const n = dataset.length;
  const alphas = new Float32Array(n);
  let bias = 0;

  for (let iter = 0; iter < maxIters; iter++) {
    for (let i = 0; i < n; i++) {
      const xi = dataset[i].x;
      const yi = dataset[i].y;

      // Predict f(xi)
      let fi = bias;
      for (let j = 0; j < n; j++) {
        fi += alphas[j] * dataset[j].y * gramMatrix[i][j];
      }

      const error = fi - yi;
      // Gradient step
      const step = 0.05 * (1 - yi * fi);
      alphas[i] = Math.max(0, Math.min(C, alphas[i] + step));
    }
  }

  // Compute bias using support vectors
  let biasSum = 0;
  let svCount = 0;
  for (let i = 0; i < n; i++) {
    if (alphas[i] > 0.01 && alphas[i] < C) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += alphas[j] * dataset[j].y * gramMatrix[i][j];
      }
      biasSum += dataset[i].y - sum;
      svCount++;
    }
  }
  bias = svCount > 0 ? biasSum / svCount : 0;

  return { alphas, bias, supportVectors: alphas.filter(a => a > 0.01).length };
}

/**
 * Predicts class label (+1 or -1) for novel 2D test point using trained QSVM.
 */
export function predictQSVM(testPoint, dataset, alphas, bias) {
  let score = bias;
  for (let i = 0; i < dataset.length; i++) {
    if (alphas[i] > 0.01) {
      const k = computeQuantumKernel(testPoint, dataset[i].x);
      score += alphas[i] * dataset[i].y * k;
    }
  }
  return {
    score,
    label: score >= 0 ? 1 : -1,
    confidence: Math.min(1.0, Math.abs(score))
  };
}

/**
 * Exports runnable Python code for Qiskit Machine Learning QSVC.
 */
export function exportToQiskitQSVC() {
  return `# Qiskit Machine Learning — Quantum Support Vector Classifier (QSVC)
# Synthesized by QuantaLearn AI (Pillar A: Quantum for AI)

import numpy as np
from qiskit.circuit.library import ZZFeatureMap
from qiskit_machine_learning.algorithms import QSVC
from qiskit_machine_learning.kernels import FidelityQuantumKernel
from qiskit_aer.primitives import Sampler

# 1. Non-linear 2-Qubit ZZ Feature Map
feature_map = ZZFeatureMap(
    feature_dimension=2,
    reps=2,
    entanglement='linear'
)

# 2. Fidelity Quantum Kernel using Aer Sampler
sampler = Sampler()
quantum_kernel = FidelityQuantumKernel(
    feature_map=feature_map,
    sampler=sampler
)

# 3. Initialize QSVC Model
qsvc = QSVC(quantum_kernel=quantum_kernel)

# Training execution:
# qsvc.fit(X_train, y_train)
# accuracy = qsvc.score(X_test, y_test)
# print(f"QSVM Test Accuracy: {accuracy * 100:.2f}%")
`;
}
