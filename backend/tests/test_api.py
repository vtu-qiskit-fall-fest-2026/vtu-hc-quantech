"""API integration tests for QuantumLearnAI backend."""
import os
os.environ["LLM_PROVIDER"] = "offline"
import unittest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestAPIEndpoints(unittest.TestCase):
    """Verifies all FastAPI routes meet specifications."""

    def test_health_check(self):
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("1.1", data["topic_ids"])
        self.assertTrue(data["loaded_topics"] >= 1)

    def test_get_topics(self):
        res = client.get("/api/topics")
        self.assertEqual(res.status_code, 200)
        topics = res.json()
        self.assertTrue(len(topics) >= 1)
        self.assertEqual(topics[0]["id"], "1.1")
        # Ensure _template is not returned
        self.assertNotIn("_template", [t["id"] for t in topics])

    def test_get_topic_details(self):
        res = client.get("/api/topics/1.1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("manifest", data)
        self.assertIn("concepts", data)
        self.assertIn("misconceptions", data)
        self.assertIn("examples", data)
        self.assertIn("assessments", data)
        self.assertNotIn("eval", data)

    def test_get_gates_palette(self):
        res = client.get("/api/gates")
        self.assertEqual(res.status_code, 200)
        gates = res.json()
        symbols = [g["symbol"] for g in gates]
        self.assertIn("H", symbols)
        self.assertIn("X", symbols)
        self.assertIn("CNOT", symbols)

    def test_circuit_simulate_bell_state(self):
        payload = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "H", "qubits": [0]},
                    {"gate": "CNOT", "qubits": [0, 1]}
                ]
            },
            "shots": 1000
        }
        res = client.post("/api/circuits/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertAlmostEqual(data["probabilities"]["00"], 0.5, places=4)
        self.assertAlmostEqual(data["probabilities"]["11"], 0.5, places=4)
        self.assertTrue(data["is_entangled"])
        self.assertTrue(data["verified_by_simulator"])
        self.assertIsNotNone(data["shots_counts"])

    def test_circuit_export_qiskit(self):
        payload = {
            "circuit": {
                "num_qubits": 2,
                "operations": [
                    {"gate": "H", "qubits": [0]},
                    {"gate": "CNOT", "qubits": [0, 1]}
                ]
            }
        }
        res = client.post("/api/circuits/export", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("qc.h(0)", data["code"])
        self.assertIn("qc.cx(0, 1)", data["code"])

    def test_assessment_check(self):
        # Q1 in 1.1 has correct option 1 (75%)
        payload = {
            "topic_id": "1.1",
            "question_id": "A01",
            "selected_option": 1
        }
        res = client.post("/api/assessment/check", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_correct"])
        self.assertIn("75%", data["feedback"])

        # Test wrong option (option 0 is 25%)
        payload["selected_option"] = 0
        res_wrong = client.post("/api/assessment/check", json=payload)
        self.assertEqual(res_wrong.status_code, 200)
        data_wrong = res_wrong.json()
        self.assertFalse(data_wrong["is_correct"])

    def test_tutor_ask_with_circuit_resimulation(self):
        """Tutor re-simulates server side and grounds answer."""
        circuit = {
            "num_qubits": 2,
            "operations": [
                {"gate": "H", "qubits": [0]},
                {"gate": "CNOT", "qubits": [0, 1]}
            ]
        }
        # Intentionally send wrong client probabilities to test server re-simulation authority
        tampered_result = {"probabilities": {"00": 0.99, "11": 0.01}}
        
        payload = {
            "question": "What does my circuit do?",
            "topic_id": "1.1",
            "circuit": circuit,
            "simulation_result": tampered_result
        }
        res = client.post("/api/tutor/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["verified"])
        self.assertTrue(data["based_on_simulation"])
        self.assertIn(data["generated_by"], ["llm", "fallback"])
        # The answer must reflect actual 50% rather than client's tampered 99%
        self.assertIn("50", data["answer"])


if __name__ == "__main__":
    unittest.main()
