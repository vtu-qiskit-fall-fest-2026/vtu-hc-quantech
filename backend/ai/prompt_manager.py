"""Prompt engineering and simulator context grounding for QuantumLearnAI."""
from typing import List, Optional
from backend.models.circuit import CircuitModel
from backend.models.simulation import SimulationResult


class PromptManager:
    """Constructs mathematically grounded prompts for the AI tutor."""

    @staticmethod
    def build_system_prompt() -> str:
        return (
            "You are QuantumLearnAI, an interactive, mathematically rigorous quantum computing tutor. "
            "PEDAGOGICAL INSTRUCTIONS (TOPIC 1.1 BEHAVIOR):\n"
            "- Start with plain language, then add mathematical and physical precision when useful.\n"
            "- Correct misconceptions explicitly and directly.\n"
            "- Avoid saying quantum computers simply 'try every answer at once'. Explain amplitude interference.\n"
            "- Avoid describing entanglement as faster-than-light communication; explain that correlations require classical comparison.\n"
            "- Avoid claiming quantum computers are universally faster at everything; state that speedups are problem-specific.\n"
            "- When mathematical or simulator ground truth is available, you MUST strictly adhere to it.\n"
            "- Never invent measurement outcomes, non-zero probabilities, or gate actions that contradict simulator data.\n"
            "- Use the mathematical examples when relevant (e.g., Born rule calculations).\n"
            "- Ask a short understanding-check question when appropriate to guide the learner socratically.\n"
            "- If a question belongs to a later topic, give a brief preview rather than pretending Topic 1.1 covers it fully."
        )

    @staticmethod
    def extract_simulation_facts(sim: Optional[SimulationResult], circuit: Optional[CircuitModel]) -> List[str]:
        """Extracts verified empirical facts from the simulator to ground the AI response."""
        facts: List[str] = []
        if not sim or sim.status != "success":
            return facts

        facts.append(f"Circuit has {sim.qubits} qubit(s)")

        if circuit and circuit.operations:
            gate_names = [f"{op.gate}(q{op.qubits})" for op in circuit.operations]
            facts.append(f"Operations applied: {', '.join(gate_names)}")

        if sim.probabilities:
            prob_items = [f"P(|{state}⟩) = {round(p * 100, 2)}%" for state, p in sim.probabilities.items() if p > 0.001]
            facts.append(f"Non-zero basis state probabilities: {', '.join(prob_items)}")

        if sim.bloch_coordinates:
            for coord in sim.bloch_coordinates:
                r_squared = coord.x**2 + coord.y**2 + coord.z**2
                if r_squared < 0.8:
                    facts.append(f"Qubit {coord.qubit} is entangled with another qubit (Bloch vector length |r| = {round(r_squared**0.5, 3)} < 1.0)")
                else:
                    facts.append(f"Qubit {coord.qubit} is in a pure state at (x={coord.x}, y={coord.y}, z={coord.z})")

        return facts

    @staticmethod
    def build_user_prompt(
        query: str,
        concept_title: Optional[str] = None,
        topic_context: Optional[str] = None,
        misconception_alerts: Optional[List[str]] = None,
        worked_examples: Optional[List[str]] = None,
        ground_truth_facts: Optional[List[str]] = None,
        simulation_facts: Optional[List[str]] = None
    ) -> str:
        """Formats the grounded prompt with topic knowledge, misconceptions, examples, and simulation telemetry."""
        parts = []
        if concept_title:
            parts.append(f"Active Concept / Topic: {concept_title}")

        if topic_context:
            parts.append(f"Curriculum Knowledge Context:\n{topic_context}")

        if misconception_alerts and len(misconception_alerts) > 0:
            parts.append("Misconception Alerts to Address:")
            for alert in misconception_alerts:
                parts.append(f"- {alert}")

        if worked_examples and len(worked_examples) > 0:
            parts.append("Relevant Worked Examples:")
            for ex in worked_examples:
                parts.append(f"- {ex}")

        if ground_truth_facts and len(ground_truth_facts) > 0:
            parts.append("Mathematical Ground Truth:")
            for gt in ground_truth_facts:
                parts.append(f"- {gt}")

        if simulation_facts and len(simulation_facts) > 0:
            parts.append("Verified Simulator Facts:")
            for fact in simulation_facts:
                parts.append(f"- {fact}")

        parts.append(f"\nLearner Question: {query}")
        return "\n".join(parts)
