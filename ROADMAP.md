# QuantumLearnAI — Architecture Roadmap & Deferred Features

In accordance with the MVP specification, several enterprise and community features were **deliberately deferred** to maintain focus on the core educational journey:
`LEARN -> ASK -> BUILD -> RUN -> SEE RESULT -> UNDERSTAND -> PRACTICE`.

This document explains how the current modular architecture supports future expansion for each deferred feature.

---

## 1. Cloud Database & User Authentication
- **Current MVP:** Uses browser `localStorage` keyed dynamically by `topic_id`, and in-memory registry scanning JSON packs on disk.
- **Future Integration:**
  - Fast-swap: Replace `localStorage` in `src/utils/progress.js` with an authenticated REST/GraphQL API.
  - User state schema: Store `user_id`, `topic_id`, `completed_concepts`, `assessment_attempts`, and saved circuits in PostgreSQL/SQLite.
  - Seamless migration: Because progress calculations are already keyed by `topic_id`, backend endpoints can return the identical JSON structure.

---

## 2. Real Quantum Hardware Execution (IBM Quantum / AWS Braket)
- **Current MVP:** Pure NumPy statevector simulator running locally as mathematical authority, with live Qiskit code export.
- **Future Integration:**
  - Extensible backend: The simulator interface (`simulate_circuit`) can accept a `backend_target` parameter (e.g., `simulator: "numpy"`, `provider: "ibm_quantum"`, `device: "ibm_kyoto"`).
  - Job queuing: Wrap execution in an asynchronous Celery/Redis queue for physical QPU scheduling while retaining the NumPy simulator for immediate local pre-checks.

---

## 3. Multi-Framework Code Transpilers (Cirq, PennyLane, Q#)
- **Current MVP:** Live-generated Qiskit 1.x Python code via `backend/quantum/export.py`.
- **Future Integration:**
  - Export registry: Convert `export.py` into a polymorphic exporter (`QiskitExporter`, `CirqExporter`, `PennyLaneExporter`) operating on the unified `CircuitModel` representation.

---

## 4. Instructor & Institution Dashboards
- **Current MVP:** Single learner focus.
- **Future Integration:**
  - The topic completion criteria (`manifest.completion_threshold`) and structured telemetry reports provide pre-computed metrics suitable for teacher dashboards or LMS (SCORM / LTI) gradebook exports.

---

## 5. Model Fine-Tuning
- **Current MVP:** Retrieval-Augmented Generation (RAG) + deterministic fallback + validator. No fine-tuning.
- **Future Integration:**
  - The held-out `eval.json` files and `train.jsonl` files in `topic_1_1/` provide structured pairs if offline fine-tuning is ever explored. However, the current prompt-grounded validator layer remains the primary guarantee against mathematical hallucination.

---

## 6. Social, Peer Matching & Community
- **Current MVP:** Focused individual learning without distraction.
- **Future Integration:**
  - Can be added via external discussion microservices linking to circuit permalinks generated from serialized circuit JSON.
