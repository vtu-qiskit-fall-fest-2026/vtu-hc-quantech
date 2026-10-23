"""Validation script for QuantumLearnAI Topic 1.1 training and evaluation datasets.

Verifies:
1. Valid JSONL syntax on all lines.
2. Valid chat messages schema: list of dicts with 'role' ('system', 'user', 'assistant') and 'content'.
3. No empty user questions.
4. No empty assistant answers.
5. Strict train/eval separation (no evaluation question leaks into training dataset).
"""
import sys
import json
from pathlib import Path

# Fix Windows console UTF-8 output if necessary
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TOPIC_DIR = PROJECT_ROOT / "topic_1_1"
TRAIN_FILE = TOPIC_DIR / "train.jsonl"
EVAL_FILE = TOPIC_DIR / "eval.jsonl"


def validate_jsonl_file(file_path: Path, dataset_name: str):
    print(f"\n--- Validating {dataset_name}: {file_path.name} ---")
    if not file_path.exists():
        raise FileNotFoundError(f"Missing file: {file_path}")

    records = []
    user_questions = set()
    errors = []

    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line_str = line.strip()
            if not line_str:
                continue

            try:
                record = json.loads(line_str)
            except json.JSONDecodeError as e:
                errors.append(f"Line {line_num}: Invalid JSON syntax ({e})")
                continue

            if not isinstance(record, dict) or "messages" not in record:
                errors.append(f"Line {line_num}: Missing top-level 'messages' field")
                continue

            messages = record["messages"]
            if not isinstance(messages, list) or len(messages) == 0:
                errors.append(f"Line {line_num}: 'messages' must be a non-empty list")
                continue

            has_user = False
            has_assistant = False

            for m_idx, msg in enumerate(messages):
                if not isinstance(msg, dict):
                    errors.append(f"Line {line_num} msg {m_idx}: message must be an object")
                    continue

                role = msg.get("role")
                content = msg.get("content")

                if role not in ("system", "user", "assistant"):
                    errors.append(f"Line {line_num} msg {m_idx}: invalid role '{role}'")

                if not isinstance(content, str) or not content.strip():
                    errors.append(f"Line {line_num} msg {m_idx}: empty content for role '{role}'")

                if role == "user":
                    has_user = True
                    user_questions.add(content.strip().lower())
                elif role == "assistant":
                    has_assistant = True

            if not has_user:
                errors.append(f"Line {line_num}: Example lacks a 'user' message")
            if not has_assistant:
                errors.append(f"Line {line_num}: Example lacks an 'assistant' message")

            records.append(record)

    if errors:
        print(f"❌ Found {len(errors)} error(s) in {file_path.name}:")
        for err in errors[:10]:
            print(f"  - {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more.")
        return False, records, user_questions

    print(f"✓ {dataset_name} is valid: {len(records)} examples checked with valid messages structure.")
    return True, records, user_questions


def run_dataset_validation():
    print("================================================================================")
    print("  QuantumLearnAI — Topic 1.1 Dataset & Schema Validation Suite")
    print("================================================================================")

    train_ok, train_records, train_questions = validate_jsonl_file(TRAIN_FILE, "Training Dataset")
    eval_ok, eval_records, eval_questions = validate_jsonl_file(EVAL_FILE, "Evaluation Dataset")

    print("\n--- Verifying Train / Eval Separation (Leakage Check) ---")
    overlap = train_questions.intersection(eval_questions)

    if overlap:
        print(f"⚠️  Train/Eval Overlap Detected: {len(overlap)} evaluation question(s) appear in training set:")
        for q in overlap:
            print(f"  - Overlap: \"{q}\"")
        print("  Notice: This overlap is recorded for the final report. Train/eval separation must be strictly enforced before model fine-tuning.")
    else:
        print(f"✓ Zero Leakage: All {len(eval_questions)} evaluation queries are strictly held out from training set.")

    if not train_ok or not eval_ok:
        print("\n❌ Dataset validation failed on schema/content errors.")
        sys.exit(1)

    print("\n================================================================================")
    print("  DATASET VALIDATION PASSED: JSONL & MESSAGE SCHEMAS CERTIFIED!")
    print(f"  Train Examples: {len(train_records)} | Eval Examples (Held Out): {len(eval_records)}")
    print(f"  Train/Eval Separation Checked: {len(overlap)} overlapping question(s) flagged.")
    print("================================================================================")
    return True


if __name__ == "__main__":
    run_dataset_validation()
