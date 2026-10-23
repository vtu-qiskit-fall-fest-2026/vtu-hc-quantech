"""NumPy Statevector Engine.

Mathematical Convention:
- Qubit-ordering: "q0 is the left-most bit in |q0 q1 ... q_{n-1}⟩".
  For n=2: index 0 is |00⟩, index 1 is |01⟩, index 2 is |10⟩, index 3 is |11⟩.
  Qubit 0 is the most significant bit (MSB) in the basis string representation.
- Statevector is normalized: ||ψ|| = 1.
"""
from typing import Tuple, List, Optional
import numpy as np


def create_initial_state(num_qubits: int) -> np.ndarray:
    """Initialize statevector to |00...0⟩ for `num_qubits`."""
    if num_qubits < 1 or num_qubits > 6:
        raise ValueError("Simulator supports 1 to 6 qubits.")
    size = 2 ** num_qubits
    state = np.zeros(size, dtype=complex)
    state[0] = 1.0 + 0.0j
    return state


def apply_single_qubit_gate(
    state: np.ndarray,
    matrix: np.ndarray,
    target: int,
    num_qubits: int
) -> np.ndarray:
    """Apply a 2x2 unitary matrix to qubit `target` using tensor contraction.
    
    Qubit ordering convention:
    Axis 0 corresponds to q0, axis 1 to q1, etc.
    """
    if target < 0 or target >= num_qubits:
        raise ValueError(f"Target qubit {target} out of range for {num_qubits} qubits.")
    
    tensor = state.reshape((2,) * num_qubits)
    # Contract matrix (axis 1) with tensor along axis `target`
    new_tensor = np.tensordot(matrix, tensor, axes=[1, target])
    # tensordot places the new index at axis 0; move it back to `target`
    new_tensor = np.moveaxis(new_tensor, 0, target)
    return new_tensor.reshape(-1)


def apply_controlled_gate(
    state: np.ndarray,
    matrix: np.ndarray,
    control: int,
    target: int,
    num_qubits: int
) -> np.ndarray:
    """Apply a controlled single-qubit unitary (e.g. CNOT) where `matrix` is applied
    to `target` only when `control` is in state |1⟩.
    """
    if control < 0 or control >= num_qubits or target < 0 or target >= num_qubits:
        raise ValueError("Control or target qubit out of bounds.")
    if control == target:
        raise ValueError("Control and target qubits must be distinct.")

    tensor = state.reshape((2,) * num_qubits).copy()
    
    # Slice where control qubit is |1⟩
    # We take slice along control axis = 1, apply single-qubit gate to target
    # To do this cleanly regardless of qubit order:
    idx_control_1 = [slice(None)] * num_qubits
    idx_control_1[control] = 1
    
    subtensor = tensor[tuple(idx_control_1)]
    
    # In subtensor, the target qubit index shifts if target > control
    sub_target = target if target < control else target - 1
    sub_num = num_qubits - 1
    
    if sub_num == 1:
        # target is the only qubit left
        transformed = matrix @ subtensor
    else:
        transformed = np.tensordot(matrix, subtensor, axes=[1, sub_target])
        transformed = np.moveaxis(transformed, 0, sub_target)
        
    tensor[tuple(idx_control_1)] = transformed
    return tensor.reshape(-1)


def compute_reduced_density_matrix(state: np.ndarray, keep_qubit: int, num_qubits: int) -> np.ndarray:
    """Compute the 2x2 reduced density matrix for `keep_qubit` by tracing out all other qubits."""
    if num_qubits == 1:
        return np.outer(state, np.conj(state))
        
    tensor = state.reshape((2,) * num_qubits)
    # Density matrix tensor: shape (2,)*num_qubits (row) + (2,)*num_qubits (col)
    rho_tensor = np.tensordot(tensor, np.conj(tensor), axes=0)
    
    # We need to trace over all axes k and k + num_qubits where k != keep_qubit
    # Let's reduce iteratively:
    # An equivalent and simple way is computing elements rho[a, b]:
    rho_2x2 = np.zeros((2, 2), dtype=complex)
    for a in (0, 1):
        for b in (0, 1):
            # Sum over all basis configurations where keep_qubit is a for ket and b for bra
            val = 0.0 + 0.0j
            for i in range(2 ** num_qubits):
                bit_a = (i >> (num_qubits - 1 - keep_qubit)) & 1
                if bit_a != a:
                    continue
                # The matching basis index j differs only at keep_qubit (which has bit b)
                j = i ^ ((a ^ b) << (num_qubits - 1 - keep_qubit))
                val += state[i] * np.conj(state[j])
            rho_2x2[a, b] = val
            
    return rho_2x2


def compute_bloch_vector(rho_2x2: np.ndarray) -> Tuple[Optional[List[float]], bool, float]:
    """Compute Bloch vector [x, y, z], entanglement status, and purity from a 2x2 reduced density matrix.
    
    Returns:
        (bloch_vector, is_entangled, purity)
        If state is entangled (purity < 0.999), bloch_vector is None per educational specification.
    """
    purity = float(np.real(np.trace(rho_2x2 @ rho_2x2)))
    
    # In pure single-qubit state, purity is 1.0
    # If purity is significantly less than 1 (tolerance 1e-4), the qubit is entangled with others
    is_entangled = purity < 0.999
    
    if is_entangled:
        return None, True, purity
        
    # Pauli decomposition: rho = 0.5 * (I + x*X + y*Y + z*Z)
    x = float(2.0 * np.real(rho_2x2[0, 1]))
    y = float(2.0 * np.imag(rho_2x2[1, 0]))
    z = float(np.real(rho_2x2[0, 0] - rho_2x2[1, 1]))
    
    return [round(x, 4), round(y, 4), round(z, 4)], False, purity
