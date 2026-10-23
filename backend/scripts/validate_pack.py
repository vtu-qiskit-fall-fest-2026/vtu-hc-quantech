"""CLI tool to validate a topic pack.

Usage:
    python backend/scripts/validate_pack.py <topic_id>

Steps:
1. Validates schema across all 7 pack files.
2. Verifies every circuit example mathematically against the simulator.
3. Runs that topic's eval.json benchmarks.
4. Runs the cross-topic regression suite.
5. Prints a complete pass/fail report.
"""
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Add project root to python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.knowledge.loader import validate_and_load_pack, TopicLoadError
from backend.knowledge.registry import TopicRegistry, DEFAULT_TOPICS_DIR
from backend.scripts.run_eval import evaluate_topic, run_all_evals


def main():
    if len(sys.argv) < 2:
        print("Usage: python backend/scripts/validate_pack.py <topic_id>")
        sys.exit(1)

    topic_id = sys.argv[1]
    topic_dir = DEFAULT_TOPICS_DIR / topic_id
    
    print("==================================================================")
    print(f"  QUANTUMLEARN AI — PACK VALIDATOR FOR TOPIC: {topic_id}")
    print("==================================================================")
    print(f"Directory: {topic_dir}")

    if not topic_dir.exists():
        print(f"❌ Error: Topic directory '{topic_dir}' does not exist.")
        sys.exit(1)

    # Step 1 & 2: Schema validation & mathematical circuit verification
    print("\n[Step 1 & 2] Validating Schema & Verifying Example Circuits...")
    try:
        pack = validate_and_load_pack(topic_dir)
        print(f"✓ Manifest valid: \"{pack.manifest.title}\" (Order: {pack.manifest.order})")
        print(f"✓ Concepts valid: {len(pack.concepts_file.concepts)} concepts loaded.")
        print(f"✓ Misconceptions valid: {len(pack.misconceptions_file.misconceptions)} items loaded.")
        print(f"✓ Worked Examples valid: {len(pack.examples_file.examples)} items loaded.")
        print(f"✓ Ground Truth valid: {len(pack.ground_truth_file.rules)} rules loaded.")
        print(f"✓ Assessments valid: {len(pack.assessments_file.assessments)} questions loaded.")
        print(f"✓ Evaluations valid: {len(pack.eval_file.evaluations)} items loaded.")
        print("✓ Mathematical verification: All example circuits passed simulator verification.")
    except TopicLoadError as tle:
        print(f"\n❌ Pack Validation Failed: {str(tle)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected Error During Validation: {str(e)}")
        sys.exit(1)

    # Step 3: Run topic's eval.json benchmarks
    print("\n[Step 3] Running Topic Benchmark Suite...")
    registry = TopicRegistry()
    eval_res = evaluate_topic(topic_id, registry)
    if eval_res.get("pass_rate", 0) < 80.0:
        print(f"\n❌ Topic benchmark score ({eval_res.get('pass_rate', 0):.1f}%) is below the 80% threshold.")
        sys.exit(1)

    # Step 4: Run cross-topic regression suite
    print("\n[Step 4] Running Cross-Topic Regression Suite...")
    regression_passed = run_all_evals()
    if not regression_passed:
        print("\n❌ Regression suite failed! Adding this topic degraded existing curriculum benchmarks.")
        sys.exit(1)

    print("\n==================================================================")
    print(f"  🎉 TOPIC {topic_id} VALIDATION PASSED COMPLETELY!")
    print("  This topic is verified, regression-free, and ready for production.")
    print("==================================================================")
    sys.exit(0)


if __name__ == "__main__":
    main()
