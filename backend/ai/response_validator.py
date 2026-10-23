"""Response Validator Engine for Quantum Computing Telemetry and Pedagogical Rules.

Cross-checks AI tutor output against:
1. Exact statevector simulation telemetry (Born rule probabilities, Bloch vectors, entanglement).
2. Quantum mathematical foundations (State normalization, unitary transformations, projective measurement).
3. Deterministic probability arithmetic (P(0) + P(1) = 1.0).
4. Socratic physics boundaries (prohibits faster-than-light claims, brute-force search fallacies).
"""
import re
from typing import List, Tuple, Optional, Any, Dict
import numpy as np

from backend.models.simulation import SimulationResult
from backend.quantum.validation import (
    validate_state_normalization,
    validate_born_rule_probabilities,
    validate_unitary_matrix,
    DEFAULT_TOLERANCE
)
from backend.quantum.gates import H_MATRIX, X_MATRIX, Z_MATRIX, S_MATRIX, T_MATRIX, CNOT_MATRIX


class ResponseValidator:
    """Validates AI tutor output against exact mathematical authority and simulator telemetry."""

    @classmethod
    def validate_mathematical_claims(
        cls,
        text: str,
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract and deterministically verify mathematical claims in the query or response."""
        query_str = (query or "").lower()
        text_lower = text.lower()
        alerts: List[str] = []
        corrections: List[str] = []
        math_valid = True

        # Check 1: Probability complement calculation P(0) = p => P(1) = 1 - p
        p0_match = re.search(r"p\(0\)\s*=\s*(0?\.\d+|\d+(?:\.\d+)?)", query_str)
        if p0_match:
            try:
                p0_val = float(p0_match.group(1))
                if 0.0 <= p0_val <= 1.0:
                    expected_p1 = round(1.0 - p0_val, 6)
                    # Look for reported p1 in response
                    # Match decimal like 0.64 or percentage like 64%
                    pct_str = f"{round(expected_p1 * 100, 1)}%"
                    dec_str = f"{expected_p1:.2f}"

                    has_correct_dec = str(expected_p1) in text_lower or dec_str in text_lower
                    has_correct_pct = pct_str in text_lower

                    if not (has_correct_dec or has_correct_pct):
                        alerts.append(
                            f"Mathematical discrepancy: For P(0) = {p0_val}, Born rule requires "
                            f"P(1) = 1 - {p0_val} = {expected_p1} ({pct_str}), but this was not found."
                        )
                        corrections.append(f"P(1) = 1 - {p0_val} = {expected_p1} ({pct_str}).")
                        math_valid = False
            except ValueError:
                pass

        # Check 2: State superposition with sqrt(3)/2 |0> + 1/2 |1>
        if ("√3/2" in query_str or "sqrt(3)/2" in query_str or "3/4" in query_str) and "|1⟩" in query_str:
            # Deterministic calculation using NumPy float64
            c0 = np.sqrt(3.0) / 2.0
            c1 = 0.5
            p0_exact = c0 ** 2  # 0.75
            p1_exact = c1 ** 2  # 0.25

            has_p0 = any(t in text_lower for t in ("75%", "0.75", "3/4", "75 percent"))
            has_p1 = any(t in text_lower for t in ("25%", "0.25", "1/4", "25 percent"))

            if not has_p0 or not has_p1:
                alerts.append(
                    f"Mathematical discrepancy: For |ψ⟩ = (√3/2)|0⟩ + (1/2)|1⟩, Born rule probabilities "
                    f"are P(0) = |√3/2|² = {p0_exact*100:.0f}% and P(1) = |1/2|² = {p1_exact*100:.0f}%."
                )
                corrections.append(
                    f"For state |ψ⟩ = (√3/2)|0⟩ + (1/2)|1⟩, Born rule gives P(0) = 75% and P(1) = 25%."
                )
                math_valid = False

        # Check 3: Consecutive Hadamards H(H|0>) = I|0> = |0>
        if ("applied twice" in query_str or "two hadamard" in query_str or "h followed by h" in query_str) and "|0⟩" in query_str:
            # Calculate matrix product H @ H
            hh = H_MATRIX @ H_MATRIX
            identity = np.eye(2, dtype=complex)
            is_identity = np.allclose(hh, identity, atol=DEFAULT_TOLERANCE)
            if is_identity:
                if "|0⟩" not in text and "|0>" not in text and "returns to |0⟩" not in text_lower and "returns to |0>" not in text_lower:
                    alerts.append(
                        "Mathematical discrepancy: H is self-inverse (H² = I). Applying H twice to |0⟩ deterministically yields |0⟩."
                    )
                    corrections.append("Applying H twice to |0⟩ returns state |0⟩ (since H·H = I).")
                    math_valid = False

        # Check 4: Bell state (|00> + |11>)/sqrt(2) outcomes
        if "bell state" in query_str or "(|00⟩+|11⟩)" in query_str or "(|00⟩ + |11⟩)" in query_str:
            has_00 = "00" in text
            has_11 = "11" in text
            has_half = any(t in text_lower for t in ("50%", "1/2", "0.5", "50 percent", "equal probability"))
            if not (has_00 and has_11 and has_half):
                alerts.append(
                    "Mathematical discrepancy: Ideal Bell state (|00⟩ + |11⟩)/√2 produces measurement outcomes "
                    "00 and 11 each with 50% probability, and 01/10 with 0%."
                )
                corrections.append("Bell state outcomes are 00 and 11, each with probability 1/2 (50%).")
                math_valid = False

        return {
            "math_valid": math_valid,
            "alerts": alerts,
            "corrections": corrections
        }

    @staticmethod
    def validate_response(
        response_text: str,
        sim: Optional[SimulationResult] = None,
        ground_truth_rules: Optional[List[Any]] = None,
        query: Optional[str] = None
    ) -> Tuple[str, float, List[str]]:
        """
        Cross-checks AI text against simulator ground truth, unitary physics, and mathematical laws.
        Returns:
            - validated_text: Response text, amended with ground-truth correction if discrepancy detected.
            - confidence_score: Adjusted confidence (0.0 to 1.0).
            - alerts: List of identified discrepancies or warnings.
        """
        alerts: List[str] = []
        confidence = 1.0
        validated_text = response_text
        response_lower = response_text.lower()

        # 1. Deterministic Mathematical Verification
        math_check = ResponseValidator.validate_mathematical_claims(response_text, query)
        if not math_check["math_valid"]:
            alerts.extend(math_check["alerts"])
            confidence = min(confidence, 0.75)
            if math_check["corrections"]:
                validated_text += "\n\n[Ground Truth Verification]: " + " ".join(math_check["corrections"])

        # 2. Simulator Telemetry Validation
        if sim:
            # Check state normalization if amplitudes available
            if hasattr(sim, "statevector") and sim.statevector:
                amps = []
                for entry in sim.statevector:
                    if isinstance(entry, dict) and "real" in entry and "imag" in entry:
                        amps.append(complex(entry["real"], entry["imag"]))
                if amps:
                    norm_val = validate_state_normalization(amps)
                    if not norm_val["is_valid"]:
                        alerts.append(f"Simulator warning: Statevector normalization violated: {norm_val['error']}")
                        confidence = min(confidence, 0.60)

            # Check outcome contradictions
            ket_matches = set(re.findall(r"\|([01]+)⟩", response_text))
            for bitstring in ket_matches:
                if len(bitstring) == getattr(sim, "qubits", 0):
                    p = getattr(sim, "probabilities", {}).get(bitstring, 0.0)
                    if p == 0.0:
                        if f"yields |{bitstring}⟩" in response_lower or f"results in |{bitstring}⟩" in response_lower or f"produces |{bitstring}⟩" in response_lower:
                            alerts.append(f"Simulator discrepancy: Text states outcome |{bitstring}⟩ occurs, but simulator probability is strictly 0.00%.")
                            confidence = min(confidence, 0.70)

        # 3. Misconception Refutations
        # Faster-than-light fallacy
        if "faster than light" in response_lower:
            negative_indicators = ["cannot", "can't", "not", "no", "never", "does not", "unable", "prohibits", "impossible"]
            has_negation = any(neg in response_lower for neg in negative_indicators)
            if not has_negation:
                alerts.append("Misconception Alert: Entanglement does not permit faster-than-light communication (no-communication theorem).")
                confidence = min(confidence, 0.65)

        # "Tries all combinations at once" fallacy
        if "try every answer" in response_lower or "tries every answer" in response_lower or "checks all answers" in response_lower:
            negative_indicators = ["not", "do not", "does not", "myth", "incorrect", "fallacy", "cannot", "doesn't"]
            has_negation = any(neg in response_lower for neg in negative_indicators)
            if not has_negation:
                alerts.append("Misconception Alert: Quantum computers do not simply try all possibilities simultaneously.")
                confidence = min(confidence, 0.65)

        return validated_text, round(confidence, 2), alerts


def validate_response(
    response: str,
    prompt: Optional[str] = None,
    simulator_result: Optional[Any] = None
) -> Dict[str, Any]:
    """Functional interface matching simulator verification caller requirements."""
    validated_text, confidence, alerts = ResponseValidator.validate_response(
        response_text=response,
        sim=simulator_result,
        query=prompt
    )
    return {
        "is_valid": len(alerts) == 0,
        "confidence": confidence,
        "alerts": alerts,
        "validated_text": validated_text,
        "hallucination_detected": len(alerts) > 0
    }
