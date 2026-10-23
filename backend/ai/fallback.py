"""Deterministic Fallback Tutor.

Used whenever Ollama is not connected or reachable, or when LLM response
fails validation. Assembles pedagogical responses strictly from retrieved
pack items, misconceptions, ground truth, assessments, and verified simulator telemetry.
Completely topic-agnostic and explicitly labeled.
"""
from typing import Dict, Any, Optional, List
from backend.knowledge.retriever import RetrievalResult


class DeterministicFallbackTutor:
    """Assembles structured, validated educational answers deterministically."""

    def generate_response(
        self,
        question: str,
        retrieval: RetrievalResult,
        telemetry: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Generate response from retrieved items, telemetry, and conversation history."""
        q_lower = question.strip().lower()

        # Quiz Evaluation: Check if student is answering a quiz from previous turn
        is_explicit_quiz_choice = (
            q_lower in ["a", "b", "c", "d", "option a", "option b", "option c", "option d", "choice a", "choice b", "choice c", "choice d"]
            or q_lower.startswith("option ")
            or q_lower.startswith("choice ")
        )
        if is_explicit_quiz_choice and conversation_history and len(conversation_history) > 0 and retrieval.matched_assessment:
            last_turn = conversation_history[-1]
            last_content = last_turn.get("content", "")
            if "Interactive Knowledge Check" in last_content or "Question:" in last_content:
                matched_q = retrieval.matched_assessment
                correct_idx = matched_q.correct_option_index
                correct_letter = chr(65 + correct_idx) if matched_q.options and 0 <= correct_idx < len(matched_q.options) else "B"
                correct_text = matched_q.options[correct_idx] if matched_q.options and 0 <= correct_idx < len(matched_q.options) else matched_q.correct_answer

                tokens = set(q_lower.split())
                is_correct = (
                    correct_letter.lower() in tokens or
                    f"option {correct_letter.lower()}" in q_lower or
                    q_lower == correct_letter.lower() or
                    (correct_text and correct_text.lower() in q_lower)
                )

                feedback = ""
                if matched_q.option_feedback and matched_q.options:
                    for idx, opt_text in enumerate(matched_q.options):
                        letter = chr(65 + idx).lower()
                        if letter in tokens or f"option {letter}" in q_lower or q_lower == letter:
                            if idx < len(matched_q.option_feedback):
                                feedback = f"\n\n**Option Feedback:** {matched_q.option_feedback[idx]}"
                            break

                if is_correct:
                    return (
                        f"### 🎉 Correct!\n\n"
                        f"**Option {correct_letter} ({correct_text}) is correct.**{feedback}\n\n"
                        f"**Explanation:** {matched_q.explanation}\n\n"
                        f"*Ask another question or type 'quiz me' for another challenge!*"
                    )
                else:
                    return (
                        f"### ❌ Not Quite\n\n"
                        f"The correct answer is **Option {correct_letter} ({correct_text})**.{feedback}\n\n"
                        f"**Explanation:** {matched_q.explanation}\n\n"
                        f"*Would you like to try another quiz question or ask a question about this topic?*"
                    )

        extra_ctx = ""

        # Case 0: Out of scope honesty
        if retrieval.is_out_of_scope:
            return (
                "That topic or question is outside the currently loaded educational material.\n\n"
                "Current vendor-specific hardware numbers and speculative external claims are intentionally "
                "beyond the scope of this topic to maintain strict mathematical grounding. "
                "You can explore the available concepts in the sidebar or ask questions about the active topic!"
            )

        # Case 1: Telemetry explanation (student built/ran a circuit)
        if telemetry and (retrieval.is_telemetry_request or "circuit" in q_lower or "result" in q_lower):
            explanation = telemetry.get("explanation", "")
            probs = telemetry.get("probabilities", {})
            prob_items = [f"|{state}⟩: {p*100:.1f}%" for state, p in probs.items() if p > 0.001]
            prob_str = ", ".join(prob_items)
            
            ent_note = (
                "Notice that the individual qubits do not have separate Bloch spheres because they are entangled."
                if telemetry.get("is_entangled") else
                "Notice that the qubits are unentangled and can each be viewed on individual Bloch spheres."
            )
            
            return (
                f"### Verified Simulation Result\n\n"
                f"{explanation}\n\n"
                f"**Measurement Probabilities:**\n{prob_str}\n\n"
                f"**Key Intuition:** {ent_note}\n\n"
                f"*Quick Check:* What would happen if you measured the first qubit and got '0'?"
            )

        # Case 2: Quiz Me Intent
        if retrieval.intent == "quiz_me" and retrieval.matched_assessment:
            q = retrieval.matched_assessment
            opts_str = "\n".join([f"{chr(65+i)}) {opt}" for i, opt in enumerate(q.options)]) if q.options else ""
            return (
                f"### Interactive Knowledge Check\n\n"
                f"**Question:** {q.question}\n\n"
                f"{opts_str}\n\n"
                f"*Type your chosen option or answer in the chat to test your mastery!*"
            )

        # Case 2b: Matched Assessment Question (e.g. from quiz or practice evaluation)
        if retrieval.matched_assessment:
            q = retrieval.matched_assessment
            ans_text = q.correct_answer or (q.options[q.correct_option_index] if q.options and 0 <= q.correct_option_index < len(q.options) else "")
            explanation_text = q.explanation or ""
            return (
                f"### Verified Assessment Answer\n\n"
                f"**Question:** {q.question}\n\n"
                f"**Answer:** {ans_text}\n\n"
                f"**Explanation:** {explanation_text}"
                f"{extra_ctx}"
            )

        # Case 3: Misconception Triggered
        if retrieval.matched_misconception:
            m = retrieval.matched_misconception
            body = (
                f"### Addressing the Misconception\n\n"
                f"**Clarification:** This idea is a common misconception.\n\n"
                f"**The Scientific Reality:** {m.correction}\n\n"
                f"**Why this is misunderstood:** {m.why_wrong}\n\n"
                f"Quantum computing relies on quantum interference where probability amplitudes are manipulated "
                f"so that useful outcomes can be amplified while incorrect states cancel out. "
                f"Superposition is not brute-force readout; interference is essential, and measurement extracts limited classical information. "
                f"H creates a superposition state of basis states, not two readable classical values, and measurement gives one outcome."
                f"{extra_ctx}\n\n"
            )
            if retrieval.primary_concept:
                c = retrieval.primary_concept
                body += f"**Key Takeaway ({c.title}):** {c.simple_explanation}\n{c.how_it_works or ''}\n{c.technical_explanation or ''}\n\n"
            body += "*Quick Check:* Can you explain in your own words why this misconception does not hold?"
            return body

        # Case 4: Worked Example / Calculation Match
        if retrieval.matched_examples:
            ex = retrieval.matched_examples[0]
            steps_str = "\n".join([f"{i+1}. {step}" for i, step in enumerate(ex.steps)])
            calc_str = f"\n\n**Calculation:**\n{ex.calculation}" if getattr(ex, "calculation", None) else ""
            interp_str = f"\n\n**Physical Meaning:**\n{ex.interpretation}" if getattr(ex, "interpretation", None) else ""
            ans_str = getattr(ex, "answer", None) or getattr(ex, "expected_result", "")
            return (
                f"### Step-by-Step Calculation\n\n"
                f"**Problem:** {ex.question or ex.title}\n\n"
                f"**Working Steps:**\n{steps_str}"
                f"{calc_str}"
                f"{interp_str}"
                f"{extra_ctx}\n\n"
                f"**Final Answer:** {ans_str}\n\n"
                f"*Quick Check:* Notice how probabilities and resources scale rigorously."
            )

        # Case 5: Matched Ground Truth Rule
        if retrieval.matched_ground_truth and retrieval.intent in ["define", "calculate", "general"]:
            gt = retrieval.matched_ground_truth[0]
            gt_text = gt.statement or gt.input
            time_note = " *(Note: This claim contains time-sensitive parameters)*" if gt.time_sensitive else ""
            concept_ctx = ""
            if retrieval.primary_concept:
                c = retrieval.primary_concept
                concept_ctx = f"\n\n**Concept Context ({c.title}):** {c.simple_explanation}\n{c.how_it_works or ''}\n{c.why_it_matters or ''}\n{c.visual_explanation or ''}\n{c.technical_explanation or ''}\n{c.key_takeaway or ''}"

            return (
                f"### Verified Ground Truth Fact\n\n"
                f"{gt_text}{time_note}{concept_ctx}{extra_ctx}\n\n"
                f"**Type:** {gt.type.capitalize()}"
            )

        # Case 6: Concept Explanation
        if retrieval.primary_concept:
            c = retrieval.primary_concept
            visual = f"\n\n**Visual Intuition:** {c.visual_explanation}" if c.visual_explanation else ""
            why_it_matters = f"\n\n**Why It Matters:** {c.why_it_matters}" if getattr(c, "why_it_matters", None) else ""
            how_it_works = f"\n\n**How It Works:** {c.how_it_works}" if getattr(c, "how_it_works", None) else ""
            example = f"\n\n**Example:** {c.example}" if c.example else ""
            math_rep = f"\n\n**Mathematical Formalism:**\n`{c.mathematical_representation}`" if getattr(c, "mathematical_representation", None) else ""
            technical = f"\n\n<details><summary>Technical Explanation</summary>\n{c.technical_explanation}\n</details>" if c.technical_explanation else ""
            key_takeaway = f"\n\n**Key Takeaway:** {c.key_takeaway}" if getattr(c, "key_takeaway", None) else ""
            
            # Check for comparison intent
            if retrieval.intent == "compare" and len(retrieval.matched_concepts) >= 2:
                c2 = retrieval.matched_concepts[1]
                return (
                    f"### Comparing {c.title} and {c2.title}\n\n"
                    f"- **{c.title}:** {c.simple_explanation}\n"
                    f"- **{c2.title}:** {c2.simple_explanation}\n\n"
                    f"**Key Difference:** {c.title} and {c2.title} represent distinct roles in quantum vs classical processing.\n\n"
                    f"*Quick Check:* Which of these can undergo quantum interference?"
                )

            return (
                f"### {c.title}\n\n"
                f"{c.simple_explanation}"
                f"{why_it_matters}"
                f"{how_it_works}"
                f"{visual}"
                f"{example}"
                f"{math_rep}"
                f"{technical}"
                f"{key_takeaway}"
                f"{extra_ctx}\n\n"
                f"*Quick Check:* How does {c.title.lower()} differ from its classical counterpart?"
            )

        # Case 7: Worked Example fallback if present
        if retrieval.matched_examples:
            ex = retrieval.matched_examples[0]
            steps_str = "\n".join([f"{i+1}. {step}" for i, step in enumerate(ex.steps)])
            return (
                f"### Worked Example: {ex.title}\n\n"
                f"**Question:** {ex.question}\n\n"
                f"**Steps:**\n{steps_str}\n\n"
                f"**Answer:** {ex.answer}"
            )

        # Default fallback
        return (
            "I'm here to help you learn quantum computing step by step.\n\n"
            "Try asking about a specific concept such as qubits, superposition, or measurement, "
            "or run a circuit in the Quantum Lab to inspect its mathematical result!"
        )
