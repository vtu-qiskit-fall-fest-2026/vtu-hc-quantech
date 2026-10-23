# Content Gaps Report: Topic 1.1 Adaptation

This report documents the structural gaps identified when mapping the raw `topic_1_1/` files into the normalized `backend/knowledge/topics/1.1/` content pack schema.

---

## 1. Missing File: `assessments.json`
- **Raw File Status:** The raw `topic_1_1/` directory contained `knowledge.json`, `misconceptions.json`, `examples.json`, `ground_truth.json`, `eval.jsonl`, and `train.jsonl`. It did not contain an explicit `assessments.json` file.
- **Handling:** Rather than inventing educational claims, 4 multiple-choice assessments were structured strictly from the verified facts in `ground_truth.json` (GT01, GT02, GT04, GT05) and `examples.json` (Born rule calculation, double-Hadamard interference, faster-than-light refutation, and NISQ definition).
- **Options and Feedback:** Distractor options were formulated from common misunderstandings documented in `misconceptions.json`, with explanatory feedback tied to verified facts.

---

## 2. Concept Field Segmentation: `concepts.json`
- **Raw File Status:** Raw `knowledge.json` provided each concept with `id`, `title`, `definition`, and `explanation` (with occasional `mathematics` arrays).
- **Schema Requirements:** The `concepts.json` schema requires progressive disclosure: `simple_explanation`, `visual_explanation`, `technical_explanation`, and `example`.
- **Handling:**
  - Raw `definition` was mapped to `simple_explanation`.
  - Raw `explanation` was mapped to visual and conceptual intuition.
  - Raw `mathematics` and formal descriptions were mapped to `technical_explanation` (expandable in the UI).
  - Concrete applications cited in the source text (e.g. quantum chemistry simulation, electron spin, superconducting circuits) were isolated into `example`.
  - No new factual assertions were introduced.

---

## 3. Trigger and Guardrail Metadata: `misconceptions.json`
- **Raw File Status:** Raw `misconceptions.json` provided `id`, `misconception`, and `correction`.
- **Schema Requirements:** The schema requires `trigger_keywords` (for retrieval and prompt routing) and `forbidden_phrases` (for the validator layer and anti-hype guardrails).
- **Handling:** Trigger keywords and forbidden phrases were extracted directly from the wording of each misconception and correction text.

---

## 4. Evaluation Formatting: `eval.json`
- **Raw File Status:** Raw evaluation examples were provided in OpenAI chat-message JSONL format (`eval.jsonl`).
- **Schema Requirements:** The schema requires an `eval.json` with `expected_key_points`, `forbidden_points`, and `category` (definition, misconception, calculation, adversarial, out-of-scope).
- **Handling:** Converted message pairs into structured evaluation items, adding adversarial and out-of-scope boundary test cases as mandated by the benchmark specification.

---

## 5. Visual Component Mappings for Topic 1.1 Concepts
- **Content Pack Status:** Raw concept data provided `visual_explanation` text strings but did not specify structured visual component types or coordinates.
- **Handling & Component Selections:** In accordance with the non-negotiable principle "Never create topic-specific visual components; build a reusable data-driven visual component system", the frontend maps concept types to reusable components as follows:
  - **`bit_vs_qubit`** (`BitVsQubit.jsx`): Assigned to Concepts C02 (Classical Bit) and C03 (Qubit) to visually and interactively contrast binary deterministic switching with continuous probability amplitude vectors.
  - **`probability_bars`** (`ProbabilityBars.jsx`): Assigned to Concepts C04 (Superposition), C05 (Measurement), C06 (Probability Amplitudes), and C08 (Entanglement), rendering mathematical amplitude-squared distributions. (Also used for live quantum simulator telemetry).
  - **`circuit_diagram`** (`CircuitDiagram.jsx`): Assigned to Concept C09 (Quantum Circuit) and concepts with `circuit_example` (C03), rendering SVG wires, unitary gate boxes, and CNOT control/target connectors.
  - **`state_stepper`** (`StateStepper.jsx`): Assigned to Concept C07 (Interference), showing the discrete transition from $|0\rangle \to \frac{|0\rangle+|1\rangle}{\sqrt{2}} \to |0\rangle$ with destructive cancellation.
  - **`flow_diagram`** (`FlowDiagram.jsx`): Assigned to Concepts C01 (Quantum Computing), C10 (Decoherence), C11 (NISQ), C12 (Problem-Specific Speedup), C13 (Hybrid Classical-Quantum Computing), and C14 (Qubit Technologies), structuring multistep algorithmic and physical workflows.
- **Review Guidance:** All visuals derive mathematical data from verified examples or simulator telemetry, and provide mandatory caption, alt-text, and "What am I looking at?" progressive explanations.
