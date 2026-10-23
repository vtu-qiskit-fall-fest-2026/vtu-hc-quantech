"""Validation Layer for QuantumLearnAI Tutor.

Topic-Agnostic, Data-Driven Verification:
1. Numeric Check: Checks numbers / percentages against simulator telemetry.
2. Forbidden Claims: Checks against merged forbidden phrases from all loaded packs + global rules.
3. Grounding Check: Ensures claims match state properties (e.g. entanglement vs product state).
4. Scope Check: Ensures out-of-scope questions are answered honestly with a scope disclaimer.
"""
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

from backend.ai.prompts import GLOBAL_FORBIDDEN_RULES


@dataclass
class ValidationResult:
    """Outcome of validating a tutor response."""
    passed: bool
    checks: List[Dict[str, Any]] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)


class ResponseValidator:
    """Validates AI tutor responses against mathematical authority and pack constraints."""

    def __init__(self, global_forbidden: Optional[List[str]] = None):
        self.global_forbidden = global_forbidden or GLOBAL_FORBIDDEN_RULES

    def validate(
        self,
        answer: str,
        telemetry: Optional[Dict[str, Any]] = None,
        pack_forbidden_phrases: Optional[List[str]] = None,
        is_out_of_scope: bool = False
    ) -> ValidationResult:
        """Run all validation checks on the proposed answer."""
        checks = []
        reasons = []
        ans_lower = answer.lower()

        # 1. Forbidden Claims Check
        forbidden_list = list(self.global_forbidden)
        if pack_forbidden_phrases:
            forbidden_list.extend(pack_forbidden_phrases)

        forbidden_passed = True
        violated_phrases = []
        for phrase in forbidden_list:
            if phrase.lower() in ans_lower:
                forbidden_passed = False
                violated_phrases.append(phrase)

        checks.append({
            "name": "forbidden_claims_check",
            "passed": forbidden_passed,
            "details": violated_phrases if not forbidden_passed else "No forbidden claims found"
        })
        if not forbidden_passed:
            reasons.append(f"Answer contains forbidden claim(s): {', '.join(violated_phrases)}")

        # 2. Grounding & Entanglement Check
        if telemetry:
            is_entangled = telemetry.get("is_entangled", False)
            grounding_passed = True
            
            # If simulator reports unentangled, answer should not assert it's an entangled state
            if not is_entangled:
                if "is entangled" in ans_lower or "maximally entangled" in ans_lower or "entangled bell state" in ans_lower:
                    grounding_passed = False
                    reasons.append("Answer claims circuit is entangled, but simulator proved state is separable (unentangled).")

            checks.append({
                "name": "grounding_check",
                "passed": grounding_passed,
                "details": f"Entanglement matches telemetry: {is_entangled}"
            })

            # 3. Numeric Check
            # Extract percentages and check if any contradict simulator telemetry
            numeric_passed = True
            # Find percentages in answer like 75%, 50%, 25%, 100%
            found_pcts = re.findall(r"(\d+(?:\.\d+)?)\s*%", answer)
            actual_probs = telemetry.get("probabilities", {})
            actual_pcts = [round(p * 100, 1) for p in actual_probs.values()]

            # If user asks about their circuit, percentages stated should match active probabilities
            if found_pcts and actual_pcts:
                # If there's an explicit percentage mentioned that doesn't correspond to any valid probability
                for pct_str in found_pcts:
                    pct_val = float(pct_str)
                    # Ignore 0% or 100% or small tolerances, check if it's close to any actual outcome probability
                    matches = any(abs(pct_val - p) < 2.0 for p in actual_pcts) or pct_val in [0.0, 100.0]
                    # Only flag if active non-trivial probabilities exist
                    if not matches and len(actual_pcts) <= 4:
                        # Could be a mismatched number
                        numeric_passed = False
                        reasons.append(f"Percentage {pct_str}% does not match simulator telemetry outcomes ({actual_pcts}%).")
                        break

            checks.append({
                "name": "numeric_check",
                "passed": numeric_passed,
                "details": f"Telemetry probabilities: {actual_probs}"
            })

        # 4. Scope Check
        if is_out_of_scope:
            scope_indicators = ["outside", "not covered", "not in the current", "beyond the scope", "future lesson"]
            scope_passed = any(ind in ans_lower for ind in scope_indicators)
            checks.append({
                "name": "scope_check",
                "passed": scope_passed,
                "details": "Out-of-scope question acknowledged correctly" if scope_passed else "Failed to state out-of-scope limit"
            })
            if not scope_passed:
                reasons.append("Question is outside loaded curriculum, but answer did not state this boundary.")

        all_passed = all(c["passed"] for c in checks)
        return ValidationResult(
            passed=all_passed,
            checks=checks,
            reasons=reasons
        )
