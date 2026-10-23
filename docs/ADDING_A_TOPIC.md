# Adding a New Topic to QuantumLearnAI

QuantumLearnAI is built on a strictly **topic-agnostic content-pack architecture**. Adding a new curriculum topic (such as Topic 1.2, 2.1, etc.) requires **zero changes to routes, components, prompts, or retrieval logic**.

---

## 1. Content Pack Structure

Every topic resides in its own isolated folder under `backend/knowledge/topics/<topic_id>/` and must contain exactly 7 files:

| File | Purpose | Schema Model |
|---|---|---|
| `manifest.json` | Metadata, title, prerequisites, estimated time, status, gates used, suggested questions. | `TopicManifest` |
| `concepts.json` | Educational concepts: simple explanation, visual intuition, technical basis, example. | `ConceptsFile` |
| `misconceptions.json` | Common myths, why they are wrong, scientific corrections, trigger keywords, forbidden phrases. | `MisconceptionsFile` |
| `examples.json` | Worked mathematical/circuit examples with optional simulator verification circuits. | `ExamplesFile` |
| `ground_truth.json` | Verified facts and numeric rules used by validator and tests. | `GroundTruthFile` |
| `assessments.json` | Quick-check questions with options, correct answer index, and per-option feedback. | `AssessmentsFile` |
| `eval.json` | Benchmark questions (definitions, misconceptions, calculations, adversarial, out-of-scope). Never shown to LLM as knowledge. | `EvalFile` |

---

## 2. Step-by-Step Workflow

### Step 1: Copy the Template Pack
QuantumLearnAI includes a starter pack in `backend/knowledge/topics/_template/` (folder names starting with an underscore are ignored by the registry until renamed):

```bash
# On Linux/macOS
cp -r backend/knowledge/topics/_template backend/knowledge/topics/1.2

# On Windows (PowerShell)
Copy-Item -Recurse backend\knowledge\topics\_template backend\knowledge\topics\1.2
```

### Step 2: Populate the Content
Open `backend/knowledge/topics/1.2/` and fill in the 7 JSON files:
- Set `"id": "1.2"` in `manifest.json` and `"topic_id": "1.2"` across all files.
- If the topic introduces new quantum gates (e.g., Pauli-Z, Phase S, T), list them in `manifest.json` under `"gates_used"`.
- If new gates need mathematical unitary matrices, add them to `GATE_REGISTRY` in `backend/quantum/gates.py` (optional, as H, X, Y, Z, S, T, and CNOT are already pre-registered).

### Step 3: Run the CLI Pack Validator
Run the automated pack validator CLI tool:

```bash
python backend/scripts/validate_pack.py 1.2
```

This script automatically:
1. Validates all 7 files against the Pydantic schemas.
2. Simulates every circuit in `examples.json` using the NumPy statevector simulator and compares expected probabilities.
3. Executes that topic's `eval.json` benchmark set.
4. Executes the cross-topic regression suite to guarantee that adding the new topic did not degrade performance on existing topics.
5. Prints a pass/fail report.

### Step 4: Restart Backend
Restart the FastAPI backend:
```bash
python -m backend.main
```
The new topic immediately appears in the Home Dashboard, Sidebar, Learning View, AI Tutor, and Practice screens. Zero frontend or route code was touched.
