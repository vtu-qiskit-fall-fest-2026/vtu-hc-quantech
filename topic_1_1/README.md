# QuantumLearnAI — Topic 1.1 Demo Data

Topic: What Is Quantum Computing?

Files:
- knowledge.json: structured teaching knowledge for retrieval
- misconceptions.json: misconception/correction pairs
- examples.json: worked mathematical and circuit examples
- ground_truth.json: exact verifiable results
- train.jsonl: supervised tutor-behavior examples
- eval.jsonl: held-out evaluation examples; DO NOT use for training

For today's prototype, connect knowledge.json/misconceptions.json/examples.json to the existing KnowledgeBase/TutorService. The train.jsonl and eval.jsonl are prepared for a later fine-tuning/evaluation step.

Source handling:
- Content is derived from the supplied Topic 1.1 research document.
- Claims in the research document marked as requiring textbook verification or time-sensitive refresh were not used as unqualified ground truth in this demo package.
