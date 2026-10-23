"""Circuit service managing validation, metric extraction, and multi-framework export."""
from typing import Dict, Any
from backend.models.circuit import CircuitModel, CircuitValidationResult
from backend.quantum.circuit_parser.parser import CircuitParser


class CircuitService:
    """Provides circuit validation, analysis, and translation to Qiskit, Cirq, and PennyLane."""

    @staticmethod
    def validate_circuit(circuit: CircuitModel) -> CircuitValidationResult:
        return CircuitParser.validate(circuit)

    @staticmethod
    def to_code(circuit: CircuitModel, framework: str = "qiskit") -> str:
        fw = framework.lower()
        if fw == "qiskit":
            return CircuitParser.to_qiskit(circuit)
        elif fw == "cirq":
            return CircuitParser.to_cirq(circuit)
        elif fw in ("pennylane", "penny_lane"):
            return CircuitParser.to_pennylane(circuit)
        else:
            return CircuitParser.to_qiskit(circuit)

    @staticmethod
    def analyze_circuit(circuit: CircuitModel) -> Dict[str, Any]:
        val = CircuitParser.validate(circuit)
        gate_breakdown: Dict[str, int] = {}
        for op in circuit.operations:
            g = op.gate.upper()
            gate_breakdown[g] = gate_breakdown.get(g, 0) + 1

        return {
            "num_qubits": circuit.num_qubits,
            "depth": val.depth,
            "total_gates": val.gate_count,
            "multi_qubit_gates": val.multi_qubit_gates,
            "gate_breakdown": gate_breakdown,
            "is_entangling": val.multi_qubit_gates > 0
        }
