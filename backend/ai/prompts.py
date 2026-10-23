"""System Prompts and Prompt Formatting for QuantumLearnAI Tutor.

Topic-Agnostic, Anti-Hype, and Grounded in Verified Curriculum Knowledge and Simulator Telemetry.
"""
from typing import Dict, Any, List, Optional
from backend.knowledge.retriever import RetrievalResult

GLOBAL_FORBIDDEN_RULES = [
    "A quantum computer tries every answer at once",
    "A qubit literally stores two classical bits",
    "Entanglement allows faster-than-light communication",
    "Quantum computers are faster for everything",
    "Quantum computers will replace classical computers"
]

SYSTEM_PROMPT = """You are a curriculum-grounded quantum computing tutor.

Your job is to explain concepts, solve questions, and quiz students using the provided curriculum context. When a student asks for a quiz, ask them a multiple-choice question with options A), B), C), and D) based on the curriculum."""

def format_curriculum_context(
    retrieval: RetrievalResult,
    telemetry: Optional[Dict[str, Any]] = None
) -> str:
    """Format retrieved curriculum chunks and simulator telemetry into coherent context text."""
    sections = []

    # 1. Retrieved chunks from semantic retriever
    if hasattr(retrieval, "retrieved_chunks") and retrieval.retrieved_chunks:
        for chunk in retrieval.retrieved_chunks:
            sections.append(chunk)
    else:
        # Fallback manual formatting of matched items
        if retrieval.matched_concepts:
            for c in retrieval.matched_concepts:
                c_str = f"Concept: {c.title}\n- Simple Explanation: {c.simple_explanation}"
                if c.mathematical_representation:
                    c_str += f"\n- Mathematical Representation: {c.mathematical_representation}"
                if c.technical_explanation:
                    c_str += f"\n- Technical Basis: {c.technical_explanation}"
                if c.example:
                    c_str += f"\n- Example: {c.example}"
                sections.append(c_str)

        if retrieval.matched_examples:
            for ex in retrieval.matched_examples:
                steps_str = " -> ".join(ex.steps) if ex.steps else ""
                sections.append(f"Worked Example: {ex.title}\n- Problem: {ex.question}\n- Steps: {steps_str}\n- Answer: {ex.answer}")

        if retrieval.matched_ground_truth:
            for gt in retrieval.matched_ground_truth:
                sections.append(f"Ground Truth Rule ({gt.id}): Input '{gt.input}' -> Expected: {gt.expected}")

        if retrieval.matched_assessment:
            sections.append(f"Curriculum Assessment: {retrieval.matched_assessment.question}\n- Options: {', '.join(retrieval.matched_assessment.options or [])}\n- Explanation: {retrieval.matched_assessment.explanation}")

        if retrieval.matched_misconception:
            m = retrieval.matched_misconception
            sections.append(f"Common Misconception: {m.misconception}\n- Why Wrong: {m.why_wrong}\n- Scientific Correction: {m.correction}")

    # 2. Simulator Telemetry (Mathematical Authority)
    if telemetry:
        probs = telemetry.get("probabilities", {})
        prob_str = ", ".join([f"P(|{k}⟩) = {v*100:.1f}%" for k, v in probs.items()])
        telem_str = (
            f"VERIFIED QUANTUM SIMULATOR TELEMETRY (MATHEMATICAL AUTHORITY):\n"
            f"- Register: {telemetry.get('num_qubits', 2)} qubits\n"
            f"- Convention: {telemetry.get('ordering_convention')}\n"
            f"- Active Measurement Probabilities: {prob_str}\n"
            f"- Entanglement Status: {telemetry.get('is_entangled')} ({telemetry.get('entanglement_method')})\n"
            f"- Mathematical Summary: {telemetry.get('explanation')}"
        )
        sections.append(telem_str)

    return "\n\n".join(sections) if sections else "(No relevant curriculum found)"


def build_tutor_prompt(
    question: str,
    retrieval: RetrievalResult,
    telemetry: Optional[Dict[str, Any]] = None,
    all_forbidden_phrases: Optional[List[str]] = None
) -> str:
    """Construct prompt containing retrieved curriculum context, question, and reasoning instructions."""
    if retrieval.is_out_of_scope:
        return (
            f"STUDENT QUESTION:\n{question}\n\n"
            "SCOPE NOTICE: This question appears to be outside the currently loaded educational material.\n"
            "Please inform the student politely and honestly that this topic is outside the currently loaded material."
        )

    curriculum_context = format_curriculum_context(retrieval, telemetry)

    instructions = [
        "INSTRUCTIONS:",
        "- Use the curriculum context whenever it is relevant.",
        "- Reason through the problem instead of simply searching for an identical sentence.",
        "- You may perform mathematical calculations and derive answers from concepts contained in the curriculum.",
        "- Do not reject a question merely because the exact wording is not present in the curriculum.",
        "- If the retrieved curriculum provides enough information, answer the question.",
        "- Only say that the topic is outside the curriculum when the retrieved curriculum genuinely contains no relevant information.",
        "- Explain the reasoning clearly.",
        "- Be concise, direct, and educational (keep explanations under 150 words).",
        "- Never invent curriculum facts."
    ]

    q_lower = question.lower()
    is_visual_q = any(w in q_lower for w in ["look", "looking at", "diagram", "visual", "figure", "graphic", "chart", "screen", "what is this visual"])
    if is_visual_q:
        instructions.append(
            "- VISUAL INTERPRETATION INSTRUCTION: The student is asking about the visual model active on their screen. "
            "Break down what the visual shows: explain what each state, wire, axis, or probability bar represents, "
            "connect it directly to the underlying quantum mathematics, and explain the key physical intuition it illustrates."
        )

    if any(w in q_lower for w in ["simpler", "simple", "beginner", "plain english", "eli5", "analog"]):
        instructions.append(
            "- SIMPLIFICATION INSTRUCTION: Explain this in intuitive, accessible terms using a grounded physical analogy. "
            "Avoid dense mathematical formalism while maintaining strict scientific accuracy without forbidden myths."
        )

    if any(w in q_lower for w in ["example", "give me an example", "worked example"]):
        instructions.append(
            "- WORKED EXAMPLE INSTRUCTION: Provide a concrete, step-by-step worked example with specific values, gates, or states."
        )

    if retrieval.intent == "quiz_me" or "quiz" in question.lower():
        instructions.append(
            "- QUIZ INSTRUCTION: The student wants to test their knowledge. "
            "Formulate ONE clear multiple-choice quiz question based on the curriculum context above. "
            "List 4 options labeled A), B), C), D), and ask the student to type their chosen option letter. "
            "Do NOT ask the student what their first question is; YOU present the quiz question to them."
        )

    if telemetry:
        instructions.append("- Notice: Simulator telemetry is the mathematical authority for any active circuit questions; incorporate its verified probabilities.")

    forbidden = list(GLOBAL_FORBIDDEN_RULES)
    if all_forbidden_phrases:
        forbidden.extend(all_forbidden_phrases)

    prompt_parts = [
        f"CURRICULUM CONTEXT:\n{curriculum_context}",
        f"STUDENT QUESTION:\n{question}",
        "\n".join(instructions)
    ]

    return "\n\n".join(prompt_parts)
