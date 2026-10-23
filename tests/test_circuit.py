"""Unit tests for Quantum Circuit Construction, Simulation & Export.

Complies with VTU-QFF Hackathon submission requirements.
Tests the quantum statevector simulator and Qiskit 1.x circuit synthesis.
"""
import os
import sys
import unittest
import numpy as np

# Ensure repository root is on sys.path regardless of execution context
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.quantum.simulator import simulate_circuit
from backend.quantum.export import export_to_qiskit

try:
    from qiskit import QuantumCircuit
    from qiskit.quantum_info import Statevector
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False


class TestCircuitSuite(unittest.TestCase):
    """Verifies quantum circuit simulation, entanglement, and Qiskit export."""

    def test_superposition_hadamard(self):
        """Single qubit Hadamard gate produces equal superposition with correct Bloch vector."""
        circuit = {
            "num_qubits": 1,
            "operations": [{"gate": "H", "qubits": [0]}]
        }
        res = simulate_circuit(circuit)
        self.assertTrue(res["normalized"])
        self.assertAlmostEqual(res["probabilities"]["0"], 0.5, places=5)
        self.assertAlmostEqual(res["probabilities"]["1"], 0.5, places=5)
        self.assertFalse(res["is_entangled"])
        
        # In state |+⟩, Bloch vector is [1, 0, 0]
        bloch = res["qubit_telemetry"][0]["bloch_vector"]
        self.assertIsNotNone(bloch)
        self.assertAlmostEqual(bloch[0], 1.0, places=3)
        self.assertAlmostEqual(bloch[1], 0.0, places=3)
        self.assertAlmostEqual(bloch[2], 0.0, places=3)

    def test_pauli_x_gate(self):
        """Pauli-X gate flips |0⟩ to |1⟩ (south pole of Bloch sphere)."""
        circuit = {
            "num_qubits": 1,
            "operations": [{"gate": "X", "qubits": [0]}]
        }
        res = simulate_circuit(circuit)
        self.assertTrue(res["normalized"])
        self.assertAlmostEqual(res["probabilities"]["0"], 0.0, places=5)
        self.assertAlmostEqual(res["probabilities"]["1"], 1.0, places=5)
        bloch = res["qubit_telemetry"][0]["bloch_vector"]
        self.assertAlmostEqual(bloch[2], -1.0, places=3)

    def test_bell_state_generation(self):
        """H on q0 followed by CNOT(q0, q1) produces the maximally entangled Bell state (|00⟩ + |11⟩)/√2."""
        circuit = {
            "num_qubits": 2,
            "operations": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]}
            ]
        }
        res = simulate_circuit(circuit)
        self.assertTrue(res["normalized"])
        self.assertTrue(res["is_entangled"])
        self.assertAlmostEqual(res["probabilities"]["00"], 0.5, places=5)
        self.assertAlmostEqual(res["probabilities"]["11"], 0.5, places=5)
        self.assertAlmostEqual(res["probabilities"]["01"], 0.0, places=5)
        self.assertAlmostEqual(res["probabilities"]["10"], 0.0, places=5)
        
        # Individual subsystems of an entangled state are mixed; Bloch vector should be None
        self.assertTrue(res["qubit_telemetry"][0]["is_entangled"])
        self.assertIsNone(res["qubit_telemetry"][0]["bloch_vector"])
        self.assertTrue(res["qubit_telemetry"][1]["is_entangled"])
        self.assertIsNone(res["qubit_telemetry"][1]["bloch_vector"])

    def test_ghz_three_qubit_circuit(self):
        """H on q0 then CNOT(0,1) and CNOT(1,2) creates 3-qubit GHZ state (|000⟩ + |111⟩)/√2."""
        circuit = {
            "num_qubits": 3,
            "operations": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]},
                {"gate": "CNOT", "qubits": [1, 2]}
            ]
        }
        res = simulate_circuit(circuit)
        self.assertTrue(res["normalized"])
        self.assertTrue(res["is_entangled"])
        self.assertAlmostEqual(res["probabilities"]["000"], 0.5, places=5)
        self.assertAlmostEqual(res["probabilities"]["111"], 0.5, places=5)

    def test_qiskit_code_export(self):
        """Export generates syntactically valid Qiskit Python code."""
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

        if QISKIT_AVAILABLE:
            # Execute generated code in a local namespace to ensure it runs cleanly
            local_scope = {}
            exec(code, {}, local_scope)
            qc_obj = local_scope.get("qc")
            self.assertIsNotNone(qc_obj)
            self.assertEqual(qc_obj.num_qubits, 2)


if __name__ == "__main__":
    unittest.main()
