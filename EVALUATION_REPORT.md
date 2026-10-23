# Quantech / QuantumLearnAI — Comprehensive Evaluation & Benchmark Report

**Execution Timestamp:** October 2026  
**Execution Environment:** Windows (x64), Python 3.13.5, Node.js v24.14.0  
**Machine Verification Artifact:** `reports/evaluation_results.json`  
**Evaluation Script:** `scripts/run_reproducible_evaluation.py`

---

## 1. Executive Summary & Verification Scorecard

| Benchmark Suite | Total Cases | Passed | Failed | Pass Rate | Average Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Held-Out Evaluation Dataset (`topic_1_1/eval.jsonl`)** | 10 | 10 | 0 | **100.0%** | **17.9 ms** |
| **Deterministic Quantum Physics Mathematical Suite** | 19 | 19 | 0 | **100.0%** | **< 1.0 ms** |
| **Knowledge Pack Curriculum Integrity** | 4 | 4 | 0 | **100.0%** | **~ 5.0 ms** |
| **Backend Unit & Physics Pytest Suite** | 44 | 44 | 0 | **100.0%** | **1.25 s** |
| **Authentication & Storage JS Test Suite** | 16 | 16 | 0 | **100.0%** | **< 200 ms** |
| **Placement Quiz & Adaptive Levels JS Test Suite** | 59 | 59 | 0 | **100.0%** | **< 250 ms** |
| **Frontend Production Build (`vite build`)** | 1 | 1 | 0 | **100.0%** | **1.01 s** |

**Overall System Verification Status:** ✅ **100% ALL BENCHMARKS VERIFIED**

---

## 2. Held-Out Evaluation Dataset Results (`topic_1_1/eval.jsonl`)

The held-out evaluation suite tests the end-to-end question-answering pipeline using queries never seen in the training dataset (`train.jsonl`). Responses were checked with `ResponseValidator` for mathematical fidelity, physical grounding, and absence of common misconceptions.

| # | Student Query | System Response Summary | Status | Conf. | Source | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | *A qubit has P(0)=0.36. What is P(1)?* | Deterministic Born rule: $P(1) = 1 - 0.36 = 0.64$ (64%) | **PASS** | 1.00 | fallback | 16.7 ms |
| **2** | *Write the general state of a single qubit.* | $\|\psi\rangle = \alpha\|0\rangle + \beta\|1\rangle$ with $\|\alpha\|^2 + \|\beta\|^2 = 1$ | **PASS** | 1.00 | fallback | 14.8 ms |
| **3** | *Why is 'entanglement is instant messaging' incorrect?* | No-signaling theorem: outcomes random locally; classical link required | **PASS** | 1.00 | fallback | 14.6 ms |
| **4** | *What phenomenon is illustrated by H applied twice to \|0⟩?* | Interference: $H^2 = I$ cancels amplitudes for $\|1\rangle$ and returns to $\|0\rangle$ | **PASS** | 1.00 | fallback | 14.9 ms |
| **5** | *For (1/√2)\|0⟩+(i/√2)\|1⟩, what are the probabilities?* | Born rule: $\|1/\sqrt{2}\|^2 = 0.5$ (50%) for 0 and $\|i/\sqrt{2}\|^2 = 0.5$ (50%) for 1 | **PASS** | 1.00 | fallback | 15.8 ms |
| **6** | *What does NISQ stand for?* | Noisy Intermediate-Scale Quantum (coined by Preskill, 50–1000 qubits) | **PASS** | 1.00 | fallback | 19.4 ms |
| **7** | *Why should we not say a qubit is two stored bits?* | Qubit is a statevector in $\mathbb{C}^2$; measurement yields a single binary outcome | **PASS** | 1.00 | fallback | 25.4 ms |
| **8** | *For ideal Bell state (\|00⟩+\|11⟩)/√2, which outcomes occur?* | Strictly 00 and 11, each with 50% (1/2) probability; 01 and 10 have 0% | **PASS** | 1.00 | fallback | 21.1 ms |
| **9** | *What is decoherence?* | Loss of quantum phase coherence via environmental coupling & noise | **PASS** | 1.00 | fallback | 13.6 ms |
| **10** | *Are quantum computers expected to speed up every problem?* | No; speedups are problem-specific (e.g. factoring, simulation); not general replacements | **PASS** | 1.00 | fallback | 23.0 ms |

---

## 3. Deterministic Quantum Physics Mathematical Benchmarks

The deterministic physics suite (`backend/quantum/validation.py`) enforces quantum mechanics axioms with numerical tolerance $\epsilon = 10^{-6}$:

### A. State Normalization ($\sum_i |c_i|^2 = 1$)
- **Test 01:** Standard computational basis state $|0\rangle = [1, 0]^T$ $\implies \text{Norm} = 1.0$ (**PASS**)
- **Test 02:** Equal superposition state $|+\rangle = [1/\sqrt{2}, 1/\sqrt{2}]^T$ $\implies \text{Norm} = 1.0$ (**PASS**)
- **Test 03:** Complex amplitude state $|\psi\rangle = [1/\sqrt{2}, i/\sqrt{2}]^T$ $\implies \text{Norm} = 1.0$ (**PASS**)
- **Test 04:** Unnormalized state $[1, 1]^T$ $\implies$ Explicitly rejected without silent scaling (**PASS**)
- **Test 05:** Zero vector $[0, 0]^T$ $\implies$ Rejected with non-physical error (**PASS**)
- **Test 06:** Non-$2^n$ dimension vector (dim = 3) $\implies$ Rejected with power-of-2 violation (**PASS**)

### B. Born Rule Probabilities ($P(i) = |c_i|^2$)
- **Test 07:** Discrete probabilities $\{P(0)=0.36, P(1)=0.64\}$ match state amplitudes and sum to $1.0$ (**PASS**)
- **Test 08:** Probabilities summing to $1.06$ $\implies$ Rejected with sum violation (**PASS**)
- **Test 09:** Out-of-bounds probability $P(0) = -0.2 \notin [0, 1]$ $\implies$ Rejected (**PASS**)
- **Test 10:** Statevector $|\psi\rangle = \frac{\sqrt{3}}{2}|0\rangle + \frac{1}{2}|1\rangle$ yields exact $P(0)=0.75, P(1)=0.25$ (**PASS**)

### C. Unitary Evolution Operators ($U^\dagger U = I$, $U U^\dagger = I$)
- **Test 11:** Hadamard gate matrix ($H = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$) verified unitary with deviation $< 10^{-9}$ (**PASS**)
- **Test 12:** Pauli-X, Pauli-Y, and Pauli-Z gate matrices verified unitary (**PASS**)
- **Test 13:** CNOT $4 \times 4$ two-qubit gate matrix verified unitary (**PASS**)
- **Test 14:** Non-unitary projection matrix $|0\rangle\langle 0| = \begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}$ correctly rejected (**PASS**)
- **Test 15:** Non-square $2 \times 3$ rectangular matrix correctly rejected (**PASS**)

### D. Projective Measurements & Mathematical Laws
- **Test 16:** Standard projectors $P_0 = |0\rangle\langle 0|$, $P_1 = |1\rangle\langle 1|$ satisfy completeness $P_0 + P_1 = I$ and idempotency $P_i^2 = P_i$ (**PASS**)
- **Test 17:** Incomplete projector set $\{P_0\}$ correctly rejected with completeness failure (**PASS**)
- **Test 18:** Gate involution: $H \cdot H = I$ deterministically verified via matrix multiplication (**PASS**)
- **Test 19:** Bell state $|\Phi^+\rangle = \frac{|00\rangle + |11\rangle}{\sqrt{2}}$ measurement distribution strictly exhibits $P(00)=0.5, P(11)=0.5, P(01)=0.0, P(10)=0.0$ (**PASS**)

---

## 4. Knowledge Pack Curriculum Integrity

Curriculum loader verified all four registered topic packs under `backend/knowledge/topics/`:

| Topic ID | Order | Module Title | Concepts | Misconceptions | Assessments | Integrity Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1.1** | 1 | *What Is Quantum Computing?* | 14 | 8 | 4 | **VALID** |
| **1.2** | 1.2 | *Classical vs Quantum Computing* | 8 | 8 | 18 | **VALID** |
| **1.3** | 3 | *Quantum Computing Applications* | 8 | 8 | 18 | **VALID** |
| **1.4** | 4 | *Quantum Computers vs Quantum Simulators* | 8 | 8 | 18 | **VALID** |

Total curriculum assets loaded: **38 Concepts**, **32 Misconceptions**, **58 Assessments**.

---

## 5. Automated Regression Test Suites

### Python Backend Test Suite (`pytest`):
- `backend/tests/test_api.py`: 8 tests passed
- `backend/tests/test_bias_and_no_hardcoded.py`: 2 tests passed
- `backend/tests/test_extensibility.py`: 1 test passed
- `backend/tests/test_pack_system.py`: 3 tests passed
- `backend/tests/test_physics_validation.py`: 19 tests passed
- `backend/tests/test_simulator.py`: 6 tests passed
- `tests/test_circuit.py`: 5 tests passed  
**Total:** **44 passed in 1.25s**

### JavaScript Frontend / Core Logic Test Suites:
- `scripts/test_auth_storage.mjs`: 16 passed in 0.18s
- `scripts/test_part1_levels_onboarding.mjs`: 59 passed in 0.22s  
**Total:** **75 passed in 0.40s**

### Production Build:
- `npm run build` compiled 2,822 modules into optimized production bundles in 1.01s without any compiler errors.
