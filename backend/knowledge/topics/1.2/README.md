# Topic 1.2 — Full-Fidelity Content Pack

This pack is based on **Quantum Computing(1).docx — Topic 1.2: Classical vs Quantum Computing**.

## Important status
This is an **authoring/content-complete draft**, not yet a release-ready `ready` pack.

The source explicitly says numerical/circuit results should be re-run in the project simulator before promotion. Therefore:
- `manifest.json` uses `draft_pending_verification`.
- `ground_truth.json` records verification status.
- Circuit examples should be checked by the current simulator before integration.
- `content.json` preserves source material that does not fit naturally into the seven runtime pack files.

## Canonical runtime files
- manifest.json
- concepts.json
- misconceptions.json
- examples.json
- ground_truth.json
- assessments.json
- eval.json

## Full-fidelity supplemental content
- content.json — overview, prerequisite recap, mathematical foundations, definitions, comparison tables, visuals, activities, tutor adaptation, sources, summary, and scope.

## Deliberate corrections from the earlier compressed draft
- Full concept decomposition is restored.
- Visuals contain interaction, expected observation, caption, alt text, and component mapping.
- Worked examples contain steps, interpretation, and circuit/qubit information.
- Misconceptions contain why-wrong, triggers, and forbidden phrases.
- Quick checks contain options, answers, explanations, per-option feedback, and concept links.
- Assessment Q04 is **medium** to preserve the requested 30/50/20 difficulty split.
- Tutor suggested questions are included.
- Evaluation items include expected key points and rubrics.
- Ground truth includes source IDs, related concepts, verification status, and qubit-ordering convention.
- The n=300 / 2^300 note is restored as a mathematical scaling example; the atom comparison is explicitly framed as an estimate rather than an exact physical constant.

## Do not integrate directly yet
The current project architecture documents a strict seven-file topic-pack runtime. `content.json` therefore acts as the full-fidelity authoring layer until the runtime schema/loader is deliberately extended to expose these sections to retrieval and the learning UI.
