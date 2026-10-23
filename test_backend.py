"""Verification test suite for QuantumLearnAI FastAPI Backend (v2, Topic-Agnostic)."""
import sys
import unittest
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_full_pipeline():
    print("================================================================================")
    print("  QuantumLearnAI v2 — Backend Architecture & Service Verification Test Suite")
    print("================================================================================")

    # 1. Health & Status
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    print(f"✓ Health Check: {data['status']} (Version {data['version']})")
    print(f"  Simulator: {data['simulator_engine']}")
    print(f"  Curriculum: {data['loaded_topics']} topics loaded: {data['topic_ids']}")
    print(f"  Ollama status: connected={data['ollama_connected']}, fallback_ready={data['fallback_tutor_ready']}")

    # 2. Topic Registry
    res = client.get("/api/topics")
    assert res.status_code == 200
    topics = res.json()
    assert len(topics) >= 1
    active_topic = topics[0]
    print(f"✓ Topic Registry: Loaded {len(topics)} topic(s). Active: Topic {active_topic['id']} - \"{active_topic['title']}\"")

    # 3. Topic Content View
    res = client.get(f"/api/topics/{active_topic['id']}")
    assert res.status_code == 200
    t_content = res.json()
    print(f"✓ Content Retrieval: {len(t_content['concepts'])} concepts, {len(t_content['misconceptions'])} misconceptions, {len(t_content['examples'])} examples, {len(t_content['assessments'])} assessments")

    # 4. Gate Registry
    res = client.get("/api/gates")
    assert res.status_code == 200
    gates = res.json()
    print(f"✓ Gate Palette: Loaded {len(gates)} gates from simulator registry: {[g['symbol'] for g in gates]}")

    # 5. Quantum Simulation (Bell State)
    bell_circuit = {
        "num_qubits": 2,
        "operations": [
            {"gate": "H", "qubits": [0]},
            {"gate": "CNOT", "qubits": [0, 1]}
        ]
    }
    sim_res = client.post("/api/circuits/simulate", json={"circuit": bell_circuit, "shots": 1000})
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["verified_by_simulator"] is True
    assert sim_data["is_entangled"] is True
    p00 = sim_data["probabilities"]["00"]
    p11 = sim_data["probabilities"]["11"]
    assert abs(p00 - 0.5) < 0.01 and abs(p11 - 0.5) < 0.01
    print(f"✓ Simulator Authority: Bell State computed rigorously:")
    print(f"  P(|00⟩) = {p00 * 100:.1f}%, P(|11⟩) = {p11 * 100:.1f}%")
    print(f"  Entanglement: {sim_data['is_entangled']} (Method: {sim_data['entanglement_method']})")

    # 6. Qiskit Export
    code_res = client.post("/api/circuits/export", json={"circuit": bell_circuit})
    assert code_res.status_code == 200
    code_data = code_res.json()
    assert "qc.h(0)" in code_data["code"] and "qc.cx(0, 1)" in code_data["code"]
    print("✓ Live Qiskit Export: Generated verified Python export code.")

    # 7. AI Tutor Grounding
    tutor_res = client.post("/api/tutor/ask", json={
        "question": "What is a qubit?",
        "topic_id": active_topic["id"]
    })
    assert tutor_res.status_code == 200
    tutor_data = tutor_res.json()
    assert tutor_data["verified"] is True
    print(f"✓ AI Tutor Grounded Query: Label={tutor_data['generated_by']}, Model={tutor_data['model']}")
    print(f"  Answer preview: {tutor_data['answer'][:100]}...")

    # 8. Assessment Check
    if t_content["assessments"]:
        first_q = t_content["assessments"][0]
        check_res = client.post("/api/assessment/check", json={
            "topic_id": active_topic["id"],
            "question_id": first_q["id"],
            "selected_option": first_q["correct_option_index"]
        })
        assert check_res.status_code == 200
        check_data = check_res.json()
        assert check_data["is_correct"] is True
        print(f"✓ Assessment Check: Q '{first_q['id']}' passed with immediate feedback: {check_data['feedback']}")

    print("\n================================================================================")
    print("  ALL V2 BACKEND ARCHITECTURE & PIPELINE CHECKS PASSED SUCCESSFULLY!")
    print("================================================================================")


if __name__ == "__main__":
    test_full_pipeline()
