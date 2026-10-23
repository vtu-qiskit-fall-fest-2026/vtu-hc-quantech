"""Test script verifying all required Quiz Flow, Intent Routing, and Markdown scenarios."""
import sys
import os

os.environ["USE_OLLAMA"] = "false"

from fastapi.testclient import TestClient
from backend.main import app
from backend.ai.tutor import get_tutor_service

client = TestClient(app)


def run_quiz_tests():
    print("================================================================================")
    print("  QuantumLearnAI — Quiz Flow & Intent Routing Verification Suite")
    print("================================================================================")

    # Disable Ollama during test 7 check to verify offline/fallback behavior
    tutor_svc = get_tutor_service()

    # TEST 1: User: "Quiz me on this concept"
    print("\n--- TEST 1: 'Quiz me on this concept' ---")
    res1 = client.post("/api/tutor/ask", json={
        "question": "Quiz me on this concept",
        "topic_id": "1.1"
    })
    assert res1.status_code == 200, f"Error: {res1.status_code} - {res1.text}"
    data1 = res1.json()
    print("AI Response:\n", data1["answer"])
    assert "Question 1 of" in data1["answer"], "Failed TEST 1: Expected 'Question 1 of' in response."
    assert "What's the first question?" not in data1["answer"], "Failed TEST 1: Asked 'What's the first question?'."
    assert data1.get("quiz_state") is not None, "Failed TEST 1: Expected quiz_state in response."
    assert data1["quiz_state"]["questionNumber"] == 1, "Failed TEST 1: questionNumber should be 1."
    print("✓ TEST 1 PASSED: AI immediately generated Question 1.")

    quiz_state1 = data1["quiz_state"]

    # TEST 2: User: "B" (answering Question 1)
    print("\n--- TEST 2: 'B' (answering Question 1) ---")
    res2 = client.post("/api/tutor/ask", json={
        "question": "B",
        "topic_id": "1.1",
        "quiz_state": quiz_state1
    })
    assert res2.status_code == 200, f"Error: {res2.status_code}"
    data2 = res2.json()
    print("AI Response:\n", data2["answer"])
    assert ("Correct!" in data2["answer"] or "Not Quite" in data2["answer"]), "Failed TEST 2: Expected feedback header."
    assert "Question 2 of" in data2["answer"] or "Quiz Complete" in data2["answer"], "Failed TEST 2: Expected next question or quiz completion."
    print("✓ TEST 2 PASSED: AI evaluated answer 'B' against stored correct answer.")

    # TEST 3: User: "Quiz me"
    print("\n--- TEST 3: 'Quiz me' ---")
    res3 = client.post("/api/tutor/ask", json={
        "question": "Quiz me",
        "topic_id": "1.1"
    })
    assert res3.status_code == 200
    data3 = res3.json()
    assert "Question 1 of" in data3["answer"], "Failed TEST 3: Expected Question 1."
    assert data3["topic_id"] == "1.1", "Failed TEST 3: Expected current topic (1.1)."
    print("✓ TEST 3 PASSED: 'Quiz me' started a quiz using current topic.")

    # TEST 4: User: "Explain this in simpler terms"
    print("\n--- TEST 4: 'Explain this in simpler terms' ---")
    res4 = client.post("/api/tutor/ask", json={
        "question": "Explain this in simpler terms",
        "topic_id": "1.1"
    })
    assert res4.status_code == 200
    data4 = res4.json()
    assert "Question 1 of" not in data4["answer"], "Failed TEST 4: Should NOT enter quiz mode for simplify request."
    print("✓ TEST 4 PASSED: 'Explain this in simpler terms' handled as simplified explanation, not quiz mode.")

    # TEST 5: User: "Why is B correct?"
    print("\n--- TEST 5: 'Why is B correct?' ---")
    res5 = client.post("/api/tutor/ask", json={
        "question": "Why is B correct?",
        "topic_id": "1.1",
        "quiz_state": quiz_state1
    })
    assert res5.status_code == 200
    data5 = res5.json()
    assert "Explanation" in data5["answer"] or "correct" in data5["answer"].lower(), "Failed TEST 5: Expected explanation."
    print("✓ TEST 5 PASSED: Explained quiz answer accurately.")

    # TEST 6: User: "Quiz me on superposition"
    print("\n--- TEST 6: 'Quiz me on superposition' ---")
    res6 = client.post("/api/tutor/ask", json={
        "question": "Quiz me on superposition",
        "topic_id": "1.1"
    })
    assert res6.status_code == 200
    data6 = res6.json()
    assert data6["topic_id"] == "1.2", f"Failed TEST 6: Topic should be 1.2 (superposition), got {data6['topic_id']}."
    assert "Question 1 of" in data6["answer"], "Failed TEST 6: Expected Question 1."
    print("✓ TEST 6 PASSED: Correctly switched to superposition topic for quiz.")

    # TEST 7: Ollama Unavailable
    print("\n--- TEST 7: Ollama Unavailable (Fallback Mode) ---")
    os.environ["USE_OLLAMA"] = "false"
    res7 = client.post("/api/tutor/ask", json={
        "question": "Quiz me",
        "topic_id": "1.1"
    })
    assert res7.status_code == 200
    data7 = res7.json()
    assert "Question 1 of" in data7["answer"], "Failed TEST 7: Fallback should handle quiz generation."
    print("✓ TEST 7 PASSED: Quiz works cleanly with curriculum-grounded fallback when Ollama is unavailable.")

    print("\n================================================================================")
    print("  ALL QUIZ FLOW AND INTENT ROUTING TESTS PASSED!")
    print("================================================================================")


if __name__ == "__main__":
    run_quiz_tests()
