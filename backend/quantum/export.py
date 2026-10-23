"""Quantum Circuit Code Exporter.

Generates clean, runnable Qiskit Python code dynamically from circuit data.
Explicitly documents endianness conventions between standard notation and Qiskit.
"""
from typing import Dict, Any


def export_to_qiskit(circuit: Dict[str, Any]) -> str:
    """Generate runnable Qiskit Python code string from a circuit dictionary."""
    num_qubits = circuit.get("num_qubits", 2)
    operations = circuit.get("operations", [])
    
    lines = [
        "# QuantumLearnAI — Exported Qiskit Circuit",
        "# Note on Qubit Ordering: In Qiskit, bitstrings are ordered little-endian (|q_{n-1}...q_0⟩),",
        "# whereas the QuantumLearnAI display orders them big-endian (|q_0...q_{n-1}⟩).",
        "",
        "from qiskit import QuantumCircuit",
        "from qiskit.quantum_info import Statevector",
        "",
        f"# Initialize circuit with {num_qubits} qubits",
        f"qc = QuantumCircuit({num_qubits})"
    ]
    
    if not operations:
        lines.append("# Empty circuit (initial state |" + "0" * num_qubits + "⟩)")
    else:
        lines.append("")
        for op in operations:
            gate = op.get("gate", "").upper()
            qubits = op.get("qubits", [])
            
            if gate == "H":
                lines.append(f"qc.h({qubits[0]})")
            elif gate == "X":
                lines.append(f"qc.x({qubits[0]})")
            elif gate == "Z":
                lines.append(f"qc.z({qubits[0]})")
            elif gate == "Y":
                lines.append(f"qc.y({qubits[0]})")
            elif gate == "S":
                lines.append(f"qc.s({qubits[0]})")
            elif gate == "T":
                lines.append(f"qc.t({qubits[0]})")
            elif gate == "CNOT":
                lines.append(f"qc.cx({qubits[0]}, {qubits[1]})")
            else:
                lines.append(f"# Custom or unknown gate: {gate} on {qubits}")
                
    lines.extend([
        "",
        "# Simulate exact statevector",
        "state = Statevector.from_instruction(qc)",
        "print('Statevector:', state)",
        "print('Probabilities (little-endian):', state.probabilities_dict())",
        "",
        "# To match QuantumLearnAI display (big-endian):",
        "big_endian_probs = {k[::-1]: v for k, v in state.probabilities_dict().items()}",
        "print('Probabilities (QuantumLearnAI format):', big_endian_probs)"
    ])
    
    return "\n".join(lines)
