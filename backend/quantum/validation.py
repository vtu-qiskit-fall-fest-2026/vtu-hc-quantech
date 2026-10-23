"""Deterministic Quantum Physics Validation Engine.

Provides rigorous mathematical verification of:
1. Quantum-state normalization (sum |c_i|^2 = 1).
2. Born rule probability distributions (P(i) = |c_i|^2) and projective measurements.
3. Unitary operator integrity (U† U = I, U U† = I).
4. Physical statevector properties and dimensional constraints.

All checks use floating-point tolerances appropriate for double-precision complex arithmetic.
Never silently normalizes invalid or malformed inputs.
"""
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np


DEFAULT_TOLERANCE = 1e-6


def validate_state_normalization(
    state: Union[np.ndarray, List[Any]],
    tolerance: float = DEFAULT_TOLERANCE
) -> Dict[str, Any]:
    """Validate that a quantum statevector is properly normalized: sum_i |c_i|^2 = 1.
    
    Args:
        state: Statevector as a 1D complex or real array.
        tolerance: Numerical tolerance for floating-point comparison.
        
    Returns:
        Dict containing:
            - is_valid: bool
            - norm: float (sum of squared magnitudes)
            - num_qubits: Optional[int]
            - dimension: int
            - error: Optional[str] explaining any failure
    """
    if tolerance <= 0:
        raise ValueError(f"Tolerance must be strictly positive, got {tolerance}")

    # 1. Type and format validation
    try:
        arr = np.asarray(state)
    except Exception as e:
        return {
            "is_valid": False,
            "norm": 0.0,
            "dimension": 0,
            "num_qubits": None,
            "error": f"Statevector could not be converted to numpy array: {e}"
        }

    if arr.ndim != 1:
        return {
            "is_valid": False,
            "norm": 0.0,
            "dimension": arr.size,
            "num_qubits": None,
            "error": f"Statevector must be a 1D vector, got ndim={arr.ndim} with shape {arr.shape}."
        }

    if arr.size == 0:
        return {
            "is_valid": False,
            "norm": 0.0,
            "dimension": 0,
            "num_qubits": None,
            "error": "Statevector cannot be empty."
        }

    # Check for non-numeric or NaN/Inf elements
    if not (np.issubdtype(arr.dtype, np.number) or np.issubdtype(arr.dtype, np.complexfloating)):
        return {
            "is_valid": False,
            "norm": 0.0,
            "dimension": arr.size,
            "num_qubits": None,
            "error": f"Statevector must contain numeric amplitudes, got dtype {arr.dtype}."
        }

    if np.any(np.isnan(arr)) or np.any(np.isinf(arr)):
        return {
            "is_valid": False,
            "norm": float('nan'),
            "dimension": arr.size,
            "num_qubits": None,
            "error": "Statevector contains NaN or infinite amplitude values."
        }

    # Dimension must be power of 2 for qubits (dimension = 2^n)
    dim = arr.size
    num_qubits = int(np.round(np.log2(dim))) if dim > 0 else 0
    if 2 ** num_qubits != dim:
        return {
            "is_valid": False,
            "norm": float(np.sum(np.abs(arr) ** 2)),
            "dimension": dim,
            "num_qubits": None,
            "error": f"Statevector dimension ({dim}) is not a power of 2 (must be 2^n for n-qubit system)."
        }

    # Compute sum |c_i|^2
    norm = float(np.sum(np.abs(arr) ** 2))

    # Check for zero vector
    if norm < tolerance:
        return {
            "is_valid": False,
            "norm": norm,
            "dimension": dim,
            "num_qubits": num_qubits,
            "error": f"Zero vector cannot represent a physical quantum state (norm={norm:.6e})."
        }

    diff = abs(norm - 1.0)
    if diff > tolerance:
        return {
            "is_valid": False,
            "norm": norm,
            "dimension": dim,
            "num_qubits": num_qubits,
            "error": f"State is not normalized: sum |c_i|^2 = {norm:.8f} (deviation {diff:.6e} > tolerance {tolerance:.6e})."
        }

    return {
        "is_valid": True,
        "norm": norm,
        "dimension": dim,
        "num_qubits": num_qubits,
        "error": None
    }


def validate_born_rule_probabilities(
    state: Union[np.ndarray, List[Any]],
    probabilities: Dict[str, float],
    tolerance: float = 1e-5
) -> Dict[str, Any]:
    """Validate that measurement probabilities satisfy the Born rule P(i) = |c_i|^2.
    
    Args:
        state: Quantum statevector.
        probabilities: Dictionary of basis bitstring to probability.
        tolerance: Numerical tolerance.
        
    Returns:
        Dict with validation result, discrepancy details, and statistics.
    """
    # First verify state normalization
    norm_result = validate_state_normalization(state, tolerance=tolerance)
    if not norm_result["is_valid"]:
        return {
            "is_valid": False,
            "error": f"Underlying statevector is invalid: {norm_result['error']}",
            "discrepancies": []
        }

    arr = np.asarray(state, dtype=complex)
    num_qubits = norm_result["num_qubits"]
    dim = norm_result["dimension"]

    discrepancies = []
    total_prob = 0.0

    # Verify each probability
    for i in range(dim):
        bitstring = format(i, f"0{num_qubits}b")
        amp = arr[i]
        expected_prob = float(np.abs(amp) ** 2)

        if bitstring not in probabilities:
            discrepancies.append(f"Missing basis state '{bitstring}' in probabilities dict.")
            continue

        reported_prob = probabilities[bitstring]

        # Basic range check
        if reported_prob < -tolerance or reported_prob > (1.0 + tolerance):
            discrepancies.append(
                f"Outcome '{bitstring}' has invalid probability {reported_prob} (must be in [0, 1])."
            )

        diff = abs(reported_prob - expected_prob)
        if diff > tolerance:
            discrepancies.append(
                f"Outcome '{bitstring}': Born rule expects |c_{bitstring}|² = {expected_prob:.6f}, "
                f"got {reported_prob:.6f} (diff {diff:.6e} > {tolerance:.6e})."
            )

        total_prob += reported_prob

    # Check total probability sums to 1
    sum_diff = abs(total_prob - 1.0)
    if sum_diff > tolerance:
        discrepancies.append(
            f"Sum of probabilities = {total_prob:.6f} != 1.0 (deviation {sum_diff:.6e} > {tolerance:.6e})."
        )

    is_valid = len(discrepancies) == 0
    return {
        "is_valid": is_valid,
        "total_probability": total_prob,
        "discrepancies": discrepancies,
        "num_qubits": num_qubits,
        "error": "; ".join(discrepancies) if discrepancies else None
    }


def validate_projective_measurement(
    state: np.ndarray,
    projectors: List[np.ndarray],
    reported_probabilities: List[float],
    tolerance: float = DEFAULT_TOLERANCE
) -> Dict[str, Any]:
    """Validate a generalized projective measurement where P_m = P_m† = P_m^2 and sum_m P_m = I.
    
    Born Rule for general measurement:
        p(m) = <ψ| P_m |ψ> = Tr(P_m |ψ><ψ|)
    """
    norm_result = validate_state_normalization(state, tolerance)
    if not norm_result["is_valid"]:
        return {
            "is_valid": False,
            "error": f"Statevector invalid: {norm_result['error']}"
        }

    psi = np.asarray(state, dtype=complex)
    dim = len(psi)
    identity = np.eye(dim, dtype=complex)
    projector_sum = np.zeros((dim, dim), dtype=complex)
    discrepancies = []

    if len(projectors) != len(reported_probabilities):
        return {
            "is_valid": False,
            "error": f"Count mismatch: {len(projectors)} projectors but {len(reported_probabilities)} probabilities."
        }

    for idx, (P, p_reported) in enumerate(zip(projectors, reported_probabilities)):
        # Check square matrix dimension
        if P.shape != (dim, dim):
            discrepancies.append(f"Projector {idx} shape {P.shape} does not match state dimension {dim}.")
            continue

        # Check Hermitian: P† = P
        p_dag = np.conj(P).T
        if not np.allclose(P, p_dag, atol=tolerance):
            discrepancies.append(f"Projector {idx} is not Hermitian (P† != P).")

        # Check idempotent: P^2 = P
        if not np.allclose(P @ P, P, atol=tolerance):
            discrepancies.append(f"Projector {idx} is not idempotent (P^2 != P).")

        # Calculate exact Born probability: p_m = <ψ| P |ψ>
        expected_p = float(np.real(np.vdot(psi, P @ psi)))
        if abs(p_reported - expected_p) > tolerance:
            discrepancies.append(
                f"Projector {idx}: Born rule expects p={expected_p:.6f}, reported={p_reported:.6f}."
            )

        projector_sum += P

    # Check completeness relation: sum P_m = I
    if not np.allclose(projector_sum, identity, atol=tolerance):
        discrepancies.append("Projectors do not satisfy completeness relation (sum P_m != I).")

    return {
        "is_valid": len(discrepancies) == 0,
        "discrepancies": discrepancies,
        "error": "; ".join(discrepancies) if discrepancies else None
    }


def validate_unitary_matrix(
    matrix: Union[np.ndarray, List[List[Any]]],
    tolerance: float = DEFAULT_TOLERANCE
) -> Dict[str, Any]:
    """Validate that a matrix represents a valid unitary quantum operator (U† U = I and U U† = I).
    
    Args:
        matrix: 2D matrix (square).
        tolerance: Numerical tolerance.
        
    Returns:
        Dict containing:
            - is_unitary: bool
            - max_deviation: float
            - dimension: Tuple[int, int]
            - num_qubits: Optional[int]
            - determinant: complex
            - error: Optional[str]
    """
    if tolerance <= 0:
        raise ValueError(f"Tolerance must be strictly positive, got {tolerance}")

    try:
        arr = np.asarray(matrix, dtype=complex)
    except Exception as e:
        return {
            "is_unitary": False,
            "max_deviation": float('inf'),
            "dimension": (0, 0),
            "num_qubits": None,
            "determinant": None,
            "error": f"Could not convert matrix to complex numpy array: {e}"
        }

    if arr.ndim != 2:
        return {
            "is_unitary": False,
            "max_deviation": float('inf'),
            "dimension": arr.shape,
            "num_qubits": None,
            "determinant": None,
            "error": f"Matrix must be 2-dimensional, got ndim={arr.ndim}."
        }

    rows, cols = arr.shape
    if rows != cols:
        return {
            "is_unitary": False,
            "max_deviation": float('inf'),
            "dimension": (rows, cols),
            "num_qubits": None,
            "determinant": None,
            "error": f"Unitary matrix must be square, got {rows}x{cols}."
        }

    if rows == 0:
        return {
            "is_unitary": False,
            "max_deviation": float('inf'),
            "dimension": (0, 0),
            "num_qubits": None,
            "determinant": None,
            "error": "Matrix cannot be empty."
        }

    if np.any(np.isnan(arr)) or np.any(np.isinf(arr)):
        return {
            "is_unitary": False,
            "max_deviation": float('inf'),
            "dimension": (rows, cols),
            "num_qubits": None,
            "determinant": None,
            "error": "Matrix contains NaN or infinite elements."
        }

    # Dimension must be power of 2 (2^k for k-qubit gate)
    num_qubits = int(np.round(np.log2(rows)))
    if 2 ** num_qubits != rows:
        return {
            "is_unitary": False,
            "max_deviation": float('inf'),
            "dimension": (rows, cols),
            "num_qubits": None,
            "determinant": None,
            "error": f"Matrix dimension {rows} is not a power of 2 (must be 2^k for k qubits)."
        }

    identity = np.eye(rows, dtype=complex)
    u_dagger = np.conj(arr).T

    # 1. Left unitarity: U† U = I
    left_prod = u_dagger @ arr
    left_dev = float(np.max(np.abs(left_prod - identity)))

    # 2. Right unitarity: U U† = I
    right_prod = arr @ u_dagger
    right_dev = float(np.max(np.abs(right_prod - identity)))

    max_deviation = max(left_dev, right_dev)

    # 3. Determinant magnitude check: |det(U)| = 1
    try:
        det = np.linalg.det(arr)
        det_mag_diff = abs(abs(det) - 1.0)
    except Exception:
        det = None
        det_mag_diff = 0.0

    if max_deviation > tolerance:
        return {
            "is_unitary": False,
            "max_deviation": max_deviation,
            "dimension": (rows, cols),
            "num_qubits": num_qubits,
            "determinant": det,
            "error": (
                f"Matrix is not unitary: max|U†U - I| = {max_deviation:.6e} > tolerance {tolerance:.6e}."
            )
        }

    if det_mag_diff > tolerance * 10:
        return {
            "is_unitary": False,
            "max_deviation": max_deviation,
            "dimension": (rows, cols),
            "num_qubits": num_qubits,
            "determinant": det,
            "error": f"Matrix determinant magnitude |det(U)| = {abs(det):.6f} != 1.0."
        }

    return {
        "is_unitary": True,
        "max_deviation": max_deviation,
        "dimension": (rows, cols),
        "num_qubits": num_qubits,
        "determinant": det,
        "error": None
    }
