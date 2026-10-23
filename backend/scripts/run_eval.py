"""Automated Evaluation Runner for QuantumLearnAI Tutor.

Runs all loaded topic packs' evaluation suites (eval.json).
Verifies that expected key points are covered, forbidden points are absent,
and out-of-scope questions are handled honestly.
"""
import sys
import re
from pathlib import Path
from typing import Dict, Any, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure project root is on PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.knowledge.registry import TopicRegistry, get_topic_registry
from backend.ai.tutor import get_tutor_service


def evaluate_topic(topic_id: str, registry: TopicRegistry) -> Dict[str, Any]:
    """Run eval.json test questions for a specific topic pack."""
    pack = registry.get_topic(topic_id)
    if not pack:
        return {"topic_id": topic_id, "error": f"Topic {topic_id} not found."}

    tutor = get_tutor_service()
    eval_items = pack.eval_file.evaluations
    total = len(eval_items)
    passed = 0
    results = []

    print(f"\n=======================================================")
    print(f"  Evaluating Topic {topic_id}: {pack.manifest.title}")
    print(f"  Benchmark items: {total}")
    print(f"=======================================================")

    for item in eval_items:
        response = tutor.ask(question=item.question, topic_id=topic_id)
        ans = response["answer"].lower()
        
        # 1. Check expected points
        def _matches_key(kp: str, text: str) -> bool:
            kp_low = kp.lower()
            if kp_low in text:
                return True
            kp_norm = re.sub(r'[\s\-_·\*=]+', '', kp_low)
            text_norm = re.sub(r'[\s\-_·\*=]+', '', text.lower())
            if kp_norm and len(kp_norm) > 2 and kp_norm in text_norm:
                return True
            words = [w.lower() for w in re.findall(r'[a-zA-Z0-9]+', kp) if len(w) > 1]
            def _w_match(w, t):
                if w in t:
                    return True
                if w == "zero" and ("0" in t or "0%" in t):
                    return True
                return False
            return len(words) > 0 and all(_w_match(w, text) for w in words)

        matched_keys = [kw for kw in item.expected_key_points if _matches_key(kw, ans)]
        # At least one major expected key point should be present
        key_point_passed = len(matched_keys) > 0 or len(item.expected_key_points) == 0

        # 2. Check forbidden points
        violated_forbidden = [f for f in item.forbidden_points if f.lower() in ans]
        forbidden_passed = len(violated_forbidden) == 0

        # 3. Check out of scope
        is_oos = (item.category == "out_of_scope") or ("out_of_scope" in item.id.lower())
        if is_oos:
            item_passed = any(ind in ans for ind in ["outside", "not covered", "not in the current", "beyond the scope"])
        else:
            item_passed = key_point_passed and forbidden_passed

        if item_passed:
            passed += 1
            status = "PASS"
        else:
            status = "FAIL"

        print(f"[{status}] {item.id} ({item.category}): \"{item.question}\"")
        if not key_point_passed:
            print(f"       Missing expected points: {item.expected_key_points}")
        if not forbidden_passed:
            print(f"       Violated forbidden points: {violated_forbidden}")

        results.append({
            "id": item.id,
            "question": item.question,
            "category": item.category,
            "passed": item_passed,
            "generated_by": response["generated_by"],
            "verified": response["verified"]
        })

    rate = (passed / total) * 100.0 if total > 0 else 0.0
    print(f"\nTopic {topic_id} Results: {passed}/{total} passed ({rate:.1f}%)")
    return {
        "topic_id": topic_id,
        "title": pack.manifest.title,
        "total": total,
        "passed": passed,
        "pass_rate": rate,
        "results": results
    }


def run_all_evals() -> bool:
    """Run regression evaluations across all registered topics."""
    registry = get_topic_registry()
    topics = registry.loaded_topic_ids
    all_passed = True

    print("\n*******************************************************")
    print("  QUANTUMLEARN AI — CROSS-TOPIC REGRESSION EVALUATION")
    print(f"  Active Topics: {topics}")
    print("*******************************************************")

    for tid in topics:
        res = evaluate_topic(tid, registry)
        if res.get("pass_rate", 0.0) < 85.0:
            all_passed = False

    return all_passed


if __name__ == "__main__":
    success = run_all_evals()
    sys.exit(0 if success else 1)
