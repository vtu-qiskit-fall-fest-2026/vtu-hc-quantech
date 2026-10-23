"""Mathematical verification tests for Quantum Simulator."""
import unittest
import numpy as np

from backend.quantum.simulator import simulate_circuit
from backend.quantum.export import export_to_qiskit


class TestQuantumSimulator(unittest.TestCase):
    """Rigorous tests verifying simulator is mathematical authority."""

    def test_single_qubit_h(self):
        """H|0⟩ -> 50% |0⟩, 50% |1⟩."""
        circuit = {
            "num_qubits": 1,
            "operations": [{"gate": "H", "qubits": [0]}]
        }
        res = simulate_circuit(circuit)
        self.assertTrue(res["normalized"])
        self.assertAlmostEqual(res["probabilities"]["0"], 0.5, places=5)
        self.assertAlmostEqual(res["probabilities"]["1"], 0.5, places=5)
        self.assertFalse(res["is_entangled"])
        bloch = res["qubit_telemetry"][0]["bloch_vector"]
        self.assertIsNotNone(bloch)
        self.assertAlmostEqual(bloch[0], 1.0, places=3) # |+⟩ has x=1, y=0, z=0
        self.assertAlmostEqual(bloch[1], 0.0, places=3)
        self.assertAlmostEqual(bloch[2], 0.0, places=3)

    def test_single_qubit_x(self):
        """X|0⟩ -> 100% |1⟩."""
        circuit = {
            "num_qubits": 1,
            "operations": [{"gate": "X", "qubits": [0]}]
        }
        res = simulate_circuit(circuit)
        self.assertTrue(res["normalized"])
        self.assertAlmostEqual(res["probabilities"]["0"], 0.0, places=5)
        self.assertAlmostEqual(res["probabilities"]["1"], 1.0, places=5)
        bloch = res["qubit_telemetry"][0]["bloch_vector"]
        self.assertAlmostEqual(bloch[2], -1.0, places=3) # |1⟩ is south pole z=-1

    def test_hh_identity(self):
        """H(H|0⟩) -> 100% |0⟩."""
        circuit = {
            "num_qubits": 1,
            "operations": [
                {"gate": "H", "qubits": [0]},
                {"gate": "H", "qubits": [0]}
            ]
        }
        res = simulate_circuit(circuit)
        self.assertAlmostEqual(res["probabilities"]["0"], 1.0, places=5)
        self.assertAlmostEqual(res["probabilities"]["1"], 0.0, places=5)
        bloch = res["qubit_telemetry"][0]["bloch_vector"]
        self.assertAlmostEqual(bloch[2], 1.0, places=3) # |0⟩ is north pole z=1

    def test_bell_state_maximally_entangled(self):
        """H(q0) then CNOT(q0, q1) on |00⟩ -> 50% |00⟩, 50% |11⟩ and entangled."""
        circuit = {
            "num_qubits": 2,
            "operations": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]}
            ]
        }
        res = simulate_circuit(circuit)
        self.assertTrue(res["normalized"])
        self.assertAlmostEqual(res["probabilities"]["00"], 0.5, places=5)
        self.assertAlmostEqual(res["probabilities"]["11"], 0.5, places=5)
        self.assertAlmostEqual(res["probabilities"]["01"], 0.0, places=5)
        self.assertAlmostEqual(res["probabilities"]["10"], 0.0, places=5)
        self.assertTrue(res["is_entangled"])
        # Both qubits must report entangled and have no Bloch vector
        self.assertTrue(res["qubit_telemetry"][0]["is_entangled"])
        self.assertIsNone(res["qubit_telemetry"][0]["bloch_vector"])
        self.assertTrue(res["qubit_telemetry"][1]["is_entangled"])
        self.assertIsNone(res["qubit_telemetry"][1]["bloch_vector"])

    def test_cnot_on_one_zero(self):
        """X(q0) then CNOT(q0, q1) on |00⟩ -> |10⟩ -> |11⟩."""
        circuit = {
            "num_qubits": 2,
            "operations": [
                {"gate": "X", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]}
            ]
        }
        res = simulate_circuit(circuit)
        self.assertAlmostEqual(res["probabilities"]["11"], 1.0, places=5)
        self.assertAlmostEqual(res["probabilities"]["10"], 0.0, places=5)
        self.assertFalse(res["is_entangled"]) # Pure basis state |11⟩ is separable

    def test_qiskit_export(self):
        """Export generates valid python code structure."""
        circuit = {
            "num_qubits": 2,
            "operations": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]}
            ]
        }
        code = export_to_qiskit(circuit)
        self.assertIn("qc = QuantumCircuit(2)", code)
        self.assertIn("qc.h(0)", code)
        self.assertIn("qc.cx(0, 1)", code)
        self.assertIn("Statevector", code)


if __name__ == "__main__":
    unittest.main()
