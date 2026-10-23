"""Quantum Gate Registry.

Defines the mathematical representations, matrix operations, and metadata
for standard quantum gates in a fully extensible, topic-agnostic registry.
New gates can be added simply by registering them in GATE_REGISTRY.
"""
from typing import Dict, Any, List, Optional
import numpy as np


class Gate:
    """Represents a quantum gate with unitary matrix representation and metadata."""

    def __init__(
        self,
        name: str,
        symbol: str,
        num_qubits: int,
        matrix: np.ndarray,
        description: str,
        before_after: Dict[str, str],
        category: str = "single_qubit"
    ):
        self.name = name
        self.symbol = symbol
        self.num_qubits = num_qubits
        self.matrix = np.array(matrix, dtype=complex)
        self.description = description
        self.before_after = before_after
        self.category = category

    def to_dict(self) -> Dict[str, Any]:
        """Serialize gate metadata for the API palette."""
        return {
            "name": self.name,
            "symbol": self.symbol,
            "num_qubits": self.num_qubits,
            "description": self.description,
            "before_after": self.before_after,
            "category": self.category
        }


# Standard Gate Matrices
H_MATRIX = (1.0 / np.sqrt(2.0)) * np.array([
    [1.0, 1.0],
    [1.0, -1.0]
], dtype=complex)

X_MATRIX = np.array([
    [0.0, 1.0],
    [1.0, 0.0]
], dtype=complex)

Y_MATRIX = np.array([
    [0.0, -1.0j],
    [1.0j, 0.0]
], dtype=complex)

Z_MATRIX = np.array([
    [1.0, 0.0],
    [0.0, -1.0]
], dtype=complex)

S_MATRIX = np.array([
    [1.0, 0.0],
    [0.0, 1.0j]
], dtype=complex)

T_MATRIX = np.array([
    [1.0, 0.0],
    [0.0, np.exp(1.0j * np.pi / 4.0)]
], dtype=complex)

# 2-qubit CNOT matrix (Control=q0, Target=q1 in standard basis |00>, |01>, |10>, |11>)
CNOT_MATRIX = np.array([
    [1.0, 0.0, 0.0, 0.0],
    [0.0, 1.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 0.0]
], dtype=complex)


# Extensible Gate Registry
GATE_REGISTRY: Dict[str, Gate] = {
    "H": Gate(
        name="Hadamard",
        symbol="H",
        num_qubits=1,
        matrix=H_MATRIX,
        description="Creates an equal superposition of |0⟩ and |1⟩ from a basis state.",
        before_after={"before": "|0⟩", "after": "(|0⟩ + |1⟩) / √2"},
        category="superposition"
    ),
    "X": Gate(
        name="Pauli-X (NOT)",
        symbol="X",
        num_qubits=1,
        matrix=X_MATRIX,
        description="Flips the state of a qubit: |0⟩ becomes |1⟩ and |1⟩ becomes |0⟩.",
        before_after={"before": "|0⟩", "after": "|1⟩"},
        category="pauli"
    ),
    "Z": Gate(
        name="Pauli-Z (Phase Flip)",
        symbol="Z",
        num_qubits=1,
        matrix=Z_MATRIX,
        description="Leaves |0⟩ unchanged and flips the phase of |1⟩ to -|1⟩.",
        before_after={"before": "|1⟩", "after": "-|1⟩"},
        category="pauli"
    ),
    "Y": Gate(
        name="Pauli-Y",
        symbol="Y",
        num_qubits=1,
        matrix=Y_MATRIX,
        description="Combines bit flip and phase flip with an imaginary phase.",
        before_after={"before": "|0⟩", "after": "i|1⟩"},
        category="pauli"
    ),
    "S": Gate(
        name="S Gate (Phase √Z)",
        symbol="S",
        num_qubits=1,
        matrix=S_MATRIX,
        description="Applies a 90-degree (π/2) phase rotation around the Z-axis.",
        before_after={"before": "|1⟩", "after": "i|1⟩"},
        category="phase"
    ),
    "T": Gate(
        name="T Gate (π/8)",
        symbol="T",
        num_qubits=1,
        matrix=T_MATRIX,
        description="Applies a 45-degree (π/4) phase rotation around the Z-axis.",
        before_after={"before": "|1⟩", "after": "e^(iπ/4)|1⟩"},
        category="phase"
    ),
    "CNOT": Gate(
        name="Controlled-NOT",
        symbol="CNOT",
        num_qubits=2,
        matrix=CNOT_MATRIX,
        description="Flips the target qubit if and only if the control qubit is |1⟩. Creates entanglement.",
        before_after={"before": "|10⟩", "after": "|11⟩"},
        category="entanglement"
    )
}


def get_gate(symbol: str) -> Optional[Gate]:
    """Retrieve a gate by its symbol."""
    return GATE_REGISTRY.get(symbol.upper())


def list_gates() -> List[Dict[str, Any]]:
    """List all available gates in the registry for palette serialization."""
    return [gate.to_dict() for gate in GATE_REGISTRY.values()]
