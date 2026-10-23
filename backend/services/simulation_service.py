"""Simulation service managing multiple backends and returning standardized results."""
import re
from typing import Dict, List, Optional
from backend.models.circuit import CircuitModel, GateOperation, CodeExecutionRequest
from backend.models.simulation import SimulationResult
from backend.quantum.simulator.base import QuantumSimulatorBackend
from backend.quantum.simulator.numpy_simulator import NumPySimulatorBackend


class SimulationService:
    """Dispatches quantum circuit execution across registered simulators."""

    def __init__(self):
        self.backends: Dict[str, QuantumSimulatorBackend] = {}
        # Register default high-performance NumPy simulator
        numpy_sim = NumPySimulatorBackend()
        self.backends[numpy_sim.name] = numpy_sim

    def get_available_backends(self) -> List[str]:
        return list(self.backends.keys())

    def simulate(self, circuit: CircuitModel, shots: int = 1024, backend_name: str = "numpy_statevector") -> SimulationResult:
        """Runs the circuit through the requested backend (with fallback)."""
        backend = self.backends.get(backend_name)
        if not backend:
            # Fallback to default
            backend = self.backends["numpy_statevector"]

        return backend.run(circuit, shots=shots)

    def parse_and_simulate_code(self, req: CodeExecutionRequest) -> SimulationResult:
        """Parses Qiskit/Python code commands into CircuitModel and executes on simulator."""
        lines = req.code.splitlines()
        num_qubits = 2
        operations: List[GateOperation] = []

        # Find QuantumCircuit(num_qubits)
        for line in lines:
            qc_match = re.search(r"QuantumCircuit\((\d+)", line)
            if qc_match:
                num_qubits = int(qc_match.group(1))
                break

        for line in lines:
            clean = line.strip()
            if clean.startswith("#") or not clean:
                continue

            # qc.h(0)
            h_match = re.search(r"\.h\((\d+)\)", clean)
            if h_match:
                operations.append(GateOperation(gate="H", qubits=[int(h_match.group(1))]))
                continue

            # qc.x(0)
            x_match = re.search(r"\.x\((\d+)\)", clean)
            if x_match:
                operations.append(GateOperation(gate="X", qubits=[int(x_match.group(1))]))
                continue

            # qc.y(0)
            y_match = re.search(r"\.y\((\d+)\)", clean)
            if y_match:
                operations.append(GateOperation(gate="Y", qubits=[int(y_match.group(1))]))
                continue

            # qc.z(0)
            z_match = re.search(r"\.z\((\d+)\)", clean)
            if z_match:
                operations.append(GateOperation(gate="Z", qubits=[int(z_match.group(1))]))
                continue

            # qc.s(0)
            s_match = re.search(r"\.s\((\d+)\)", clean)
            if s_match:
                operations.append(GateOperation(gate="S", qubits=[int(s_match.group(1))]))
                continue

            # qc.t(0)
            t_match = re.search(r"\.t\((\d+)\)", clean)
            if t_match:
                operations.append(GateOperation(gate="T", qubits=[int(t_match.group(1))]))
                continue

            # qc.cx(0, 1) or qc.cnot(0, 1)
            cx_match = re.search(r"\.(?:cx|cnot)\((\d+)\s*,\s*(\d+)\)", clean)
            if cx_match:
                c, t = int(cx_match.group(1)), int(cx_match.group(2))
                operations.append(GateOperation(gate="CNOT", qubits=[c, t]))
                continue

            # qc.cz(0, 1)
            cz_match = re.search(r"\.cz\((\d+)\s*,\s*(\d+)\)", clean)
            if cz_match:
                c, t = int(cz_match.group(1)), int(cz_match.group(2))
                operations.append(GateOperation(gate="CZ", qubits=[c, t]))
                continue

            # qc.swap(0, 1)
            swap_match = re.search(r"\.swap\((\d+)\s*,\s*(\d+)\)", clean)
            if swap_match:
                a, b = int(swap_match.group(1)), int(swap_match.group(2))
                operations.append(GateOperation(gate="SWAP", qubits=[a, b]))
                continue

        parsed_circuit = CircuitModel(
            num_qubits=max(1, min(16, num_qubits)),
            num_classical_bits=num_qubits,
            operations=operations
        )

        return self.simulate(parsed_circuit, shots=req.shots)
