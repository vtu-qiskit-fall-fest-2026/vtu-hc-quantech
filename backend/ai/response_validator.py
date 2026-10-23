"""Response validator to cross-check LLM statements against simulator ground truth."""
import re
from typing import List, Tuple, Optional, Any
from backend.models.simulation import SimulationResult


class ResponseValidator:
    """Validates AI tutor output against exact statevector simulation telemetry."""

    @staticmethod
    def validate_response(
        response_text: str,
        sim: Optional[SimulationResult],
        ground_truth_rules: Optional[List[Any]] = None,
        query: Optional[str] = None
    ) -> Tuple[str, float, List[str]]:
        """
        Cross-checks AI text against simulator ground truth and Topic 1.1 mathematical rules.
        Returns:
            - validated_text: Possibly appended with ground-truth corrections.
            - confidence_score: Adjusted confidence (0.0 to 1.0).
            - alerts: List of identified discrepancies or warnings.
        """
        alerts: List[str] = []
        confidence = 1.0
        validated_text = response_text
        query_lower = (query or "").lower()
        response_lower = response_text.lower()

        # 1. Simulator Telemetry Validation (Mathematical Authority)
        if sim and sim.status == "success":
            ket_matches = set(re.findall(r"\|([01]+)⟩", response_text))

            for bitstring in ket_matches:
                if len(bitstring) == sim.qubits:
                    p = sim.probabilities.get(bitstring, 0.0)
                    if p == 0.0:
                        context_snippet = response_lower
                        if f"yields |{bitstring}⟩" in context_snippet or f"results in |{bitstring}⟩" in context_snippet:
                            alerts.append(f"Simulator discrepancy: AI mentioned outcome |{bitstring}⟩, but simulator probability is strictly 0.00%.")
                            confidence = min(confidence, 0.85)

        # 2. Topic 1.1 Ground Truth Rules Validation
        # GT02: √3/2|0⟩ + 1/2|1⟩ -> P(0) = 75%, P(1) = 25%
        if "√3/2" in query_lower or "sqrt(3)/2" in query_lower or "√3/2" in response_lower:
            p0_correct = any(term in response_lower for term in ("75%", "0.75", "3/4", "75 percent"))
            p1_correct = any(term in response_lower for term in ("25%", "0.25", "1/4", "25 percent"))
            if not p0_correct or not p1_correct:
                alerts.append("Ground Truth discrepancy: Probability calculation for √3/2|0⟩ + 1/2|1⟩ must yield P(0)=75% and P(1)=25%.")
                confidence = min(confidence, 0.75)
                if "75%" not in validated_text and "25%" not in validated_text:
                    validated_text += "\n\n[Ground Truth Verification]: For state |ψ⟩ = (√3/2)|0⟩ + (1/2)|1⟩, Born rule probabilities are P(0) = |√3/2|² = 75% and P(1) = |1/2|² = 25%."

        # GT04: Two Hadamards H(H|0⟩) -> |0⟩
        if ("applied twice" in query_lower or "two hadamard" in query_lower or "h followed by h" in query_lower) and "|0⟩" in query_lower:
            if "|0⟩" not in response_text and "|0>" not in response_text:
                alerts.append("Ground Truth discrepancy: Applying H twice to |0⟩ must return state |0⟩.")
                confidence = min(confidence, 0.80)
                validated_text += "\n\n[Ground Truth Verification]: Applying H twice to |0⟩ yields state |0⟩ deterministically due to constructive interference on |0⟩ and cancellation on |1⟩."

        # GT05: Bell state (|00⟩ + |11⟩)/√2 -> 00 = 50%, 11 = 50%
        if "bell state" in query_lower or "(|00⟩+|11⟩)" in query_lower or "(|00⟩ + |11⟩)" in query_lower:
            has_00 = "00" in response_text
            has_11 = "11" in response_text
            has_50 = any(term in response_lower for term in ("50%", "1/2", "0.5", "50 percent"))
            if not (has_00 and has_11 and has_50):
                alerts.append("Ground Truth discrepancy: Bell state (|00⟩+|11⟩)/√2 must have outcomes 00 (50%) and 11 (50%).")
                confidence = min(confidence, 0.80)

        # 3. Misconception Overrides / Safeguards
        if "try every answer" in response_lower and "not" not in response_lower and "do not" not in response_lower:
            alerts.append("Misconception Alert: LLM suggested quantum computers simply try every answer at once.")
            confidence = min(confidence, 0.70)

        if "faster than light" in response_lower and "cannot" not in response_lower and "not" not in response_lower and "no" not in response_lower:
            alerts.append("Misconception Alert: LLM suggested entanglement transmits faster-than-light information.")
            confidence = min(confidence, 0.70)

        return validated_text, confidence, alerts
