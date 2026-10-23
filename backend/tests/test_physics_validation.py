"""Automated Regression Suite for Quantum Physics Validation Engine.

Verifies:
1. Quantum-state normalization (sum |c_i|^2 = 1, tolerance handling, edge cases).
2. Born rule probability distributions and projective measurement operators.
3. Unitary operator integrity (U† U = I, U U† = I, dimension checks).
4. ResponseValidator mathematical cross-checks and hallucination interception.
"""
import pytest
import numpy as np

from backend.quantum.validation import (
    validate_state_normalization,
    validate_born_rule_probabilities,
    validate_projective_measurement,
    validate_unitary_matrix,
    DEFAULT_TOLERANCE
)
from backend.quantum.gates import (
    H_MATRIX, X_MATRIX, Y_MATRIX, Z_MATRIX, S_MATRIX, T_MATRIX, CNOT_MATRIX
)
from backend.ai.response_validator import ResponseValidator, validate_response


class TestStateNormalization:
    """Test quantum statevector normalization constraints."""

    def test_valid_computational_basis(self):
        """Standard basis states |0⟩ and |1⟩ must be strictly valid."""
        res_0 = validate_state_normalization(np.array([1.0, 0.0], dtype=complex))
        assert res_0["is_valid"] is True
        assert res_0["num_qubits"] == 1
        assert abs(res_0["norm"] - 1.0) < 1e-12

        res_1 = validate_state_normalization(np.array([0.0, 1.0], dtype=complex))
        assert res_1["is_valid"] is True

    def test_valid_superposition_and_complex_amplitudes(self):
        """Hadamard and phase states with complex amplitudes must pass."""
        # |+⟩ state
        plus_state = np.array([1.0 / np.sqrt(2), 1.0 / np.sqrt(2)], dtype=complex)
        assert validate_state_normalization(plus_state)["is_valid"] is True

        # |+i⟩ state: (|0⟩ + i|1⟩)/√2
        plus_i_state = np.array([1.0 / np.sqrt(2), 1.0j / np.sqrt(2)], dtype=complex)
        assert validate_state_normalization(plus_i_state)["is_valid"] is True

        # Non-equal complex amplitudes
        amp_state = np.array([np.sqrt(3)/2, 0.5j], dtype=complex)
        assert validate_state_normalization(amp_state)["is_valid"] is True

    def test_multi_qubit_states(self):
        """Bell state and 3-qubit GHZ state must pass."""
        # Bell state (|00⟩ + |11⟩)/√2
        bell = np.array([1.0 / np.sqrt(2), 0.0, 0.0, 1.0 / np.sqrt(2)], dtype=complex)
        bell_res = validate_state_normalization(bell)
        assert bell_res["is_valid"] is True
        assert bell_res["num_qubits"] == 2

        # 3-qubit GHZ state (|000⟩ + |111⟩)/√2
        ghz = np.zeros(8, dtype=complex)
        ghz[0] = 1.0 / np.sqrt(2)
        ghz[7] = 1.0 / np.sqrt(2)
        ghz_res = validate_state_normalization(ghz)
        assert ghz_res["is_valid"] is True
        assert ghz_res["num_qubits"] == 3

    def test_unnormalized_states_rejected(self):
        """Unnormalized states must be rejected with informative error."""
        # Norm = 2
        unnorm = np.array([1.0, 1.0], dtype=complex)
        res = validate_state_normalization(unnorm)
        assert res["is_valid"] is False
        assert "not normalized" in res["error"]
        assert abs(res["norm"] - 2.0) < 1e-6

        # Norm = 0.5
        half_norm = np.array([0.5, 0.5], dtype=complex)
        res_half = validate_state_normalization(half_norm)
        assert res_half["is_valid"] is False
        assert abs(res_half["norm"] - 0.5) < 1e-6

    def test_zero_vector_rejected(self):
        """Zero vector must be rejected as physically unnormalizable."""
        zero_vec = np.array([0.0, 0.0], dtype=complex)
        res = validate_state_normalization(zero_vec)
        assert res["is_valid"] is False
        assert "Zero vector" in res["error"]

    def test_malformed_inputs_handled_safely(self):
        """Non-1D, empty, NaN, Inf, and non-power-of-2 inputs must fail gracefully."""
        # 2D array
        assert validate_state_normalization(np.eye(2))["is_valid"] is False
        # Empty array
        assert validate_state_normalization(np.array([]))["is_valid"] is False
        # NaN in array
        assert validate_state_normalization(np.array([np.nan, 1.0]))["is_valid"] is False
        # Inf in array
        assert validate_state_normalization(np.array([np.inf, 0.0]))["is_valid"] is False
        # Non-power-of-2 dimension (3 elements)
        res_3 = validate_state_normalization(np.array([1/np.sqrt(3), 1/np.sqrt(3), 1/np.sqrt(3)]))
        assert res_3["is_valid"] is False
        assert "not a power of 2" in res_3["error"]

    def test_tolerance_boundaries(self):
        """Tolerance parameter must strictly govern the boundary."""
        # Deviation of 5e-7 (passes with tol 1e-6, fails with tol 1e-7)
        delta = 5e-7
        norm_val = 1.0 + delta
        state = np.array([np.sqrt(norm_val), 0.0], dtype=complex)
        assert validate_state_normalization(state, tolerance=1e-6)["is_valid"] is True
        assert validate_state_normalization(state, tolerance=1e-7)["is_valid"] is False


class TestBornRuleValidation:
    """Test Born rule probabilities P(i) = |c_i|^2."""

    def test_valid_born_probabilities(self):
        """Exact Born rule probabilities must pass."""
        state = np.array([np.sqrt(3)/2, 0.5], dtype=complex)
        probs = {"0": 0.75, "1": 0.25}
        res = validate_born_rule_probabilities(state, probs)
        assert res["is_valid"] is True
        assert abs(res["total_probability"] - 1.0) < 1e-6

    def test_mismatched_probabilities_detected(self):
        """Contradictory probability values must be flagged."""
        state = np.array([np.sqrt(3)/2, 0.5], dtype=complex)
        # Inverted / wrong probabilities
        probs = {"0": 0.50, "1": 0.50}
        res = validate_born_rule_probabilities(state, probs)
        assert res["is_valid"] is False
        assert len(res["discrepancies"]) > 0

    def test_probabilities_summing_incorrectly(self):
        """Probabilities that do not sum to 1.0 must fail."""
        state = np.array([1.0, 0.0], dtype=complex)
        probs = {"0": 1.0, "1": 0.2}
        res = validate_born_rule_probabilities(state, probs)
        assert res["is_valid"] is False
        assert any("Sum of probabilities" in d for d in res["discrepancies"])

    def test_out_of_range_probabilities(self):
        """Negative probability or > 1.0 must be caught."""
        state = np.array([1.0, 0.0], dtype=complex)
        probs = {"0": 1.2, "1": -0.2}
        res = validate_born_rule_probabilities(state, probs)
        assert res["is_valid"] is False
        assert any("invalid probability" in d for d in res["discrepancies"])

    def test_general_projective_measurement(self):
        """Projective measurement formalism P_m = P_m† = P_m^2 with completeness relation."""
        psi = np.array([1/np.sqrt(2), 1/np.sqrt(2)], dtype=complex)
        # Standard projectors |0><0| and |1><1|
        P0 = np.array([[1, 0], [0, 0]], dtype=complex)
        P1 = np.array([[0, 0], [0, 1]], dtype=complex)

        res = validate_projective_measurement(psi, [P0, P1], [0.5, 0.5])
        assert res["is_valid"] is True

        # Non-Hermitian projector should fail
        bad_P0 = np.array([[1, 1], [0, 0]], dtype=complex)
        res_bad = validate_projective_measurement(psi, [bad_P0, P1], [0.5, 0.5])
        assert res_bad["is_valid"] is False


class TestUnitaryOperatorValidation:
    """Test unitary operator constraints (U† U = I, U U† = I)."""

    def test_standard_quantum_gates_are_unitary(self):
        """All fundamental gates in registry must pass unitary check."""
        for name, mat in [
            ("H", H_MATRIX),
            ("X", X_MATRIX),
            ("Y", Y_MATRIX),
            ("Z", Z_MATRIX),
            ("S", S_MATRIX),
            ("T", T_MATRIX),
            ("CNOT", CNOT_MATRIX)
        ]:
            val = validate_unitary_matrix(mat)
            assert val["is_unitary"] is True, f"Gate {name} failed unitary validation: {val['error']}"
            assert val["max_deviation"] < 1e-12

    def test_non_unitary_operators_rejected(self):
        """Projector |0⟩⟨0|, scaling by 2, and zero matrix must fail."""
        # Projection operator |0><0| (not invertible, not unitary)
        proj = np.array([[1.0, 0.0], [0.0, 0.0]], dtype=complex)
        res_proj = validate_unitary_matrix(proj)
        assert res_proj["is_unitary"] is False

        # Scaled Hadamard: 2 * H (U† U = 4 * I)
        scaled_h = 2.0 * H_MATRIX
        res_scaled = validate_unitary_matrix(scaled_h)
        assert res_scaled["is_unitary"] is False
        assert "not unitary" in res_scaled["error"]

        # Zero matrix
        res_zero = validate_unitary_matrix(np.zeros((2, 2)))
        assert res_zero["is_unitary"] is False

    def test_dimension_mismatches_handled(self):
        """Rectangular matrices and non-power-of-2 dimensions must fail."""
        # Rectangular (2x3)
        assert validate_unitary_matrix(np.ones((2, 3)))["is_unitary"] is False
        # 3x3 matrix (not 2^k)
        assert validate_unitary_matrix(np.eye(3))["is_unitary"] is False


class TestResponseValidatorIntegration:
    """Test ResponseValidator with mathematical calculations and physics rules."""

    def test_born_rule_complement_calculation(self):
        """If query asks P(1) given P(0) = 0.36, validator ensures 0.64 is in answer."""
        good_ans = "The probability of measuring |1⟩ is 0.64 (since P(0) + P(1) = 1.0)."
        check_good = ResponseValidator.validate_mathematical_claims(good_ans, query="P(0) = 0.36. What is P(1)?")
        assert check_good["math_valid"] is True
        assert len(check_good["alerts"]) == 0

        # Wrong answer
        bad_ans = "The probability of measuring |1⟩ is 0.50."
        check_bad = ResponseValidator.validate_mathematical_claims(bad_ans, query="P(0) = 0.36. What is P(1)?")
        assert check_bad["math_valid"] is False
        assert any("P(1) = 1 - 0.36 = 0.64" in a for a in check_bad["alerts"])

    def test_h_applied_twice_interference(self):
        """H applied twice to |0⟩ must return |0⟩."""
        ans = "Applying H twice returns the state to |0⟩ due to constructive and destructive interference."
        val_text, conf, alerts = ResponseValidator.validate_response(ans, query="What happens when H is applied twice to |0⟩?")
        assert conf >= 0.95
        assert len(alerts) == 0

    def test_faster_than_light_misconception_blocked(self):
        """Asserting entanglement enables FTL communication triggers alert."""
        hallucinated = "Quantum entanglement allows instantaneous communication faster than light across galaxies."
        val_text, conf, alerts = ResponseValidator.validate_response(hallucinated)
        assert conf <= 0.70
        assert any("faster-than-light" in a for a in alerts)

    def test_functional_validate_response_helper(self):
        """Functional validate_response wrapper returns expected contract."""
        res = validate_response(
            response="Applying H twice to |0⟩ returns state |0⟩.",
            prompt="What does H followed by H do to |0⟩?"
        )
        assert res["is_valid"] is True
        assert res["hallucination_detected"] is False
        assert "validated_text" in res
