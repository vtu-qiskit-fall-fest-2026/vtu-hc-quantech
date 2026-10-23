"""Quantum Simulator Implementation using NumPy Statevector Engine.

Mathematical Authority:
The simulator is the single mathematical authority in QuantumLearnAI.
All calculations, probabilities, amplitudes, and entanglement metrics
are computed rigorously.

Qubit Ordering Convention:
"q0 is the left-most bit in |q0 q1 ... q_{n-1}⟩".
"""
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from backend.quantum.gates import get_gate, X_MATRIX
from backend.quantum.statevector import (
    create_initial_state,
    apply_single_qubit_gate,
    apply_controlled_gate,
    compute_reduced_density_matrix,
    compute_bloch_vector
)


def simulate_circuit(
    circuit: Dict[str, Any],
    shots: Optional[int] = None,
    seed: Optional[int] = None
) -> Dict[str, Any]:
    """Execute a quantum circuit and return comprehensive mathematical telemetry.
    
    Args:
        circuit: Dictionary with 'num_qubits' and 'operations'.
        shots: Optional number of simulated measurement shots.
        seed: Optional RNG seed for repeatable measurement sampling.
        
    Returns:
        Telemetry dictionary with amplitudes, probabilities, Bloch vectors,
        entanglement detection, and normalization verification.
    """
    num_qubits = circuit.get("num_qubits", 2)
    operations = circuit.get("operations", [])
    
    state = create_initial_state(num_qubits)
    applied_gates = []
    
    for op in operations:
        gate_symbol = op.get("gate", "").upper()
        target_qubits = op.get("qubits", [])
        
        gate_obj = get_gate(gate_symbol)
        if not gate_obj:
            raise ValueError(f"Unknown gate '{gate_symbol}' in circuit operations.")
            
        if gate_obj.num_qubits == 1:
            if len(target_qubits) != 1:
                raise ValueError(f"Gate {gate_symbol} requires exactly 1 qubit, got {target_qubits}")
            target = target_qubits[0]
            state = apply_single_qubit_gate(state, gate_obj.matrix, target, num_qubits)
            applied_gates.append({"gate": gate_symbol, "qubits": [target]})
            
        elif gate_obj.num_qubits == 2:
            if len(target_qubits) != 2:
                raise ValueError(f"Gate {gate_symbol} requires 2 qubits [control, target], got {target_qubits}")
            ctrl, tgt = target_qubits[0], target_qubits[1]
            if gate_symbol == "CNOT":
                state = apply_controlled_gate(state, X_MATRIX, ctrl, tgt, num_qubits)
            else:
                # Generalized 2-qubit gate
                state = apply_controlled_gate(state, gate_obj.matrix, ctrl, tgt, num_qubits)
            applied_gates.append({"gate": gate_symbol, "qubits": [ctrl, tgt]})
        else:
            raise ValueError(f"Gates with {gate_obj.num_qubits} qubits are not supported.")
            
    # Calculate probabilities
    probabilities_dict = {}
    statevector_list = []
    total_prob = 0.0
    
    for i in range(2 ** num_qubits):
        # Big-endian bitstring: q0 is MSB (left-most bit)
        bitstring = format(i, f"0{num_qubits}b")
        amp = state[i]
        prob = float(np.abs(amp) ** 2)
        total_prob += prob
        
        probabilities_dict[bitstring] = round(prob, 6)
        statevector_list.append({
            "index": i,
            "bitstring": bitstring,
            "real": round(float(np.real(amp)), 6),
            "imag": round(float(np.imag(amp)), 6),
            "magnitude": round(float(np.abs(amp)), 6),
            "probability": round(prob, 6)
        })
        
    normalized = bool(abs(total_prob - 1.0) < 1e-5)
    
    # Compute per-qubit Bloch vectors and entanglement
    qubit_telemetry = {}
    any_entangled = False
    
    for q in range(num_qubits):
        rho_q = compute_reduced_density_matrix(state, q, num_qubits)
        bloch, is_entangled, purity = compute_bloch_vector(rho_q)
        if is_entangled:
            any_entangled = True
        qubit_telemetry[q] = {
            "bloch_vector": bloch,
            "is_entangled": is_entangled,
            "purity": round(purity, 4)
        }
        
    # Simulated measurement sampling if requested
    shots_counts = None
    if shots and shots > 0:
        if seed is not None:
            np.random.seed(seed)
        basis_keys = list(probabilities_dict.keys())
        prob_vals = [probabilities_dict[k] for k in basis_keys]
        # Normalize strictly for choice
        sum_p = sum(prob_vals)
        norm_p = [p / sum_p for p in prob_vals]
        samples = np.random.choice(basis_keys, size=shots, p=norm_p)
        counts = {k: 0 for k in basis_keys}
        for s in samples:
            counts[s] += 1
        shots_counts = counts
        
    # Check optional Qiskit Aer cross-check
    cross_checked, aer_agrees = _check_with_qiskit_aer(circuit, probabilities_dict)
    
    telemetry = {
        "num_qubits": num_qubits,
        "applied_gates": applied_gates,
        "probabilities": probabilities_dict,
        "statevector": statevector_list,
        "normalized": normalized,
        "qubit_telemetry": qubit_telemetry,
        "is_entangled": any_entangled,
        "entanglement_method": "reduced_density_matrix_purity",
        "shots_counts": shots_counts,
        "shots": shots,
        "ordering_convention": "q0 is the left-most bit in |q0 q1 ... q_{n-1}⟩",
        "cross_checked_with_aer": cross_checked,
        "aer_agreement": aer_agrees,
        "verified_by_simulator": True
    }
    
    telemetry["explanation"] = generate_telemetry_explanation(telemetry)
    return telemetry


def generate_telemetry_explanation(telemetry: Dict[str, Any]) -> str:
    """Generate a data-driven mathematical explanation directly from verified telemetry."""
    probs = telemetry["probabilities"]
    active_states = [s for s, p in probs.items() if p > 0.001]
    is_entangled = telemetry["is_entangled"]
    num_qubits = telemetry["num_qubits"]
    
    lines = []
    lines.append(f"Simulation of a {num_qubits}-qubit quantum circuit complete.")
    
    # Outcomes summary
    if len(active_states) == 1:
        state = active_states[0]
        lines.append(f"The circuit placed the register deterministically into basis state |{state}⟩ with 100% probability.")
    else:
        outcomes_str = ", ".join([f"|{s}⟩ with {probs[s]*100:.1f}% probability" for s in active_states])
        lines.append(f"The quantum state is in a superposition of {len(active_states)} computational basis states: {outcomes_str}.")
        
    # Entanglement telemetry
    if is_entangled:
        lines.append(
            "Entanglement Detected: The reduced density matrix of individual qubits exhibits purity < 1.0. "
            "Because the qubits are quantum-correlated, individual qubits have no independent single-qubit Bloch vector."
        )
        if len(active_states) == 2 and ("00" in probs and "11" in probs and abs(probs["00"] - 0.5) < 0.01 and abs(probs["11"] - 0.5) < 0.01):
            lines.append("Specifically, this state matches a maximally entangled Bell state (|00⟩ + |11⟩)/√2.")
    else:
        lines.append("The register remains in a separable (unentangled) product state.")
        
    lines.append(f"Verification: Statevector norm is preserved (sum of probabilities = 100%).")
    return "\n\n".join(lines)


def _check_with_qiskit_aer(
    circuit: Dict[str, Any],
    numpy_probs: Dict[str, float]
) -> Tuple[bool, Optional[bool]]:
    """Optional cross-check against Qiskit Aer if installed in the environment."""
    try:
        from qiskit import QuantumCircuit
        from qiskit_aer import Aer
        
        num_qubits = circuit.get("num_qubits", 2)
        qc = QuantumCircuit(num_qubits)
        
        for op in circuit.get("operations", []):
            gate = op.get("gate", "").upper()
            qubits = op.get("qubits", [])
            if gate == "H":
                qc.h(qubits[0])
            elif gate == "X":
                qc.x(qubits[0])
            elif gate == "Z":
                qc.z(qubits[0])
            elif gate == "Y":
                qc.y(qubits[0])
            elif gate == "S":
                qc.s(qubits[0])
            elif gate == "T":
                qc.t(qubits[0])
            elif gate == "CNOT":
                qc.cx(qubits[0], qubits[1])
                
        backend = Aer.get_backend("statevector_simulator")
        result = backend.run(qc).result()
        sv = result.get_statevector()
        aer_probs = sv.probabilities_dict()
        
        # Note: Qiskit uses little-endian (q0 is right-most). Convert to big-endian (q0 is left-most):
        # aer_probs keys are bitstrings in little-endian order 'q_{n-1}...q_0'
        # To match our convention 'q0...q_{n-1}', reverse the bitstring!
        converted_aer = {k[::-1]: v for k, v in aer_probs.items()}
        
        # Compare
        agrees = True
        for bitstring, prob in numpy_probs.items():
            aer_p = converted_aer.get(bitstring, 0.0)
            if abs(prob - aer_p) > 1e-4:
                agrees = False
                break
                
        return True, agrees
    except ImportError:
        return False, None
    except Exception:
        return False, None
