"""Comprehensive Dataset Audit Engine for Quantech / QuantumLearnAI.

Performs line-by-line inspection of:
- `topic_1_1/train.jsonl`
- `topic_1_1/eval.jsonl`

Audits:
1. Line-by-line JSON parsing and empty line detection.
2. Schema conformance (ChatML role/content structure, required keys).
3. Exact within-dataset duplicate queries.
4. Exact cross-dataset query overlap (data leakage).
5. Lexical and token-level near-duplicate detection using normalized Jaccard similarity.
6. Scientific / physical correctness of reference ground truth answers.
7. Hardcoded evaluation answer detection in codebase source files.
"""
import sys
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TOPIC_DIR = PROJECT_ROOT / "topic_1_1"
TRAIN_PATH = TOPIC_DIR / "train.jsonl"
EVAL_PATH = TOPIC_DIR / "eval.jsonl"


def normalize_query_text(text: str) -> str:
    """Normalize question text for lexical comparison, standardizing math notations."""
    t = text.lower().strip()
    # Normalize common symbols
    t = t.replace("√3/2", "sqrt3_2").replace("1/2", "half").replace("1/√2", "inv_sqrt2")
    t = t.replace("|0⟩", "|0>").replace("|1⟩", "|1>").replace("|00⟩", "|00>").replace("|11⟩", "|11>")
    t = t.replace("’", "'").replace("“", '"').replace("”", '"')
    # Strip punctuation except alphanumeric and math tokens
    t = re.sub(r"[^\w\s|><+\-=]", "", t)
    return re.sub(r"\s+", " ", t).strip()


def tokenize(text: str) -> Set[str]:
    """Tokenize normalized text into meaningful set of words."""
    norm = normalize_query_text(text)
    words = re.findall(r"[a-z0-9_><|]+", norm)
    stopwords = {"what", "is", "a", "the", "for", "of", "to", "in", "and", "or", "does", "do", "how", "why", "are"}
    return {w for w in words if w not in stopwords and len(w) > 1}


def jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Compute Jaccard token overlap similarity."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0


def parse_and_validate_dataset(file_path: Path) -> Dict[str, Any]:
    """Inspect and validate individual JSONL dataset file."""
    report = {
        "file_name": file_path.name,
        "exists": file_path.exists(),
        "total_lines": 0,
        "valid_records": 0,
        "empty_lines": 0,
        "syntax_errors": [],
        "schema_errors": [],
        "records": [],
        "user_queries": [],
        "exact_duplicates": []
    }

    if not file_path.exists():
        report["syntax_errors"].append(f"File not found: {file_path}")
        return report

    seen_queries = {}

    with open(file_path, "r", encoding="utf-8") as f:
        for line_idx, line in enumerate(f, start=1):
            report["total_lines"] += 1
            raw_line = line.strip()
            if not raw_line:
                report["empty_lines"] += 1
                continue

            try:
                record = json.loads(raw_line)
            except json.JSONDecodeError as e:
                report["syntax_errors"].append({"line": line_idx, "error": str(e)})
                continue

            if not isinstance(record, dict) or "messages" not in record:
                report["schema_errors"].append({"line": line_idx, "error": "Missing 'messages' object"})
                continue

            messages = record["messages"]
            if not isinstance(messages, list) or len(messages) == 0:
                report["schema_errors"].append({"line": line_idx, "error": "'messages' must be a non-empty list"})
                continue

            user_msg = None
            asst_msg = None
            role_error = None

            for m in messages:
                if not isinstance(m, dict):
                    role_error = f"Message item is not a dict on line {line_idx}"
                    break
                role = m.get("role")
                content = m.get("content")
                if role not in ("system", "user", "assistant"):
                    role_error = f"Invalid role '{role}' on line {line_idx}"
                    break
                if not isinstance(content, str) or not content.strip():
                    role_error = f"Empty content for role '{role}' on line {line_idx}"
                    break

                if role == "user":
                    user_msg = content.strip()
                elif role == "assistant":
                    asst_msg = content.strip()

            if role_error:
                report["schema_errors"].append({"line": line_idx, "error": role_error})
                continue

            if not user_msg:
                report["schema_errors"].append({"line": line_idx, "error": "Missing user message"})
                continue

            if not asst_msg:
                report["schema_errors"].append({"line": line_idx, "error": "Missing assistant message"})
                continue

            # Check duplicates within dataset
            norm_q = normalize_query_text(user_msg)
            if norm_q in seen_queries:
                report["exact_duplicates"].append({
                    "query": user_msg,
                    "first_line": seen_queries[norm_q],
                    "duplicate_line": line_idx
                })
            else:
                seen_queries[norm_q] = line_idx

            report["records"].append({
                "line": line_idx,
                "user": user_msg,
                "assistant": asst_msg,
                "messages": messages
            })
            report["user_queries"].append(user_msg)
            report["valid_records"] += 1

    return report


def check_cross_dataset_overlap(train_records: List[Dict], eval_records: List[Dict]) -> Dict[str, Any]:
    """Check exact matches and potential paraphrased/near-duplicate pairs across datasets."""
    exact_leakages = []
    near_duplicates = []

    train_normalized = [
        {"idx": i, "orig": r["user"], "norm": normalize_query_text(r["user"]), "tokens": tokenize(r["user"])}
        for i, r in enumerate(train_records)
    ]

    for e_idx, e_rec in enumerate(eval_records):
        e_orig = e_rec["user"]
        e_norm = normalize_query_text(e_orig)
        e_tokens = tokenize(e_orig)

        for t in train_normalized:
            # 1. Exact match check
            if e_norm == t["norm"]:
                exact_leakages.append({
                    "eval_index": e_idx + 1,
                    "eval_query": e_orig,
                    "train_index": t["idx"] + 1,
                    "train_query": t["orig"]
                })
            else:
                # 2. Jaccard similarity near-duplicate check
                sim = jaccard_similarity(e_tokens, t["tokens"])
                if sim >= 0.55:
                    near_duplicates.append({
                        "similarity": round(sim, 3),
                        "eval_index": e_idx + 1,
                        "eval_query": e_orig,
                        "train_index": t["idx"] + 1,
                        "train_query": t["orig"]
                    })

    return {
        "exact_leakages": exact_leakages,
        "near_duplicates": sorted(near_duplicates, key=lambda x: x["similarity"], reverse=True)
    }


def verify_ground_truth_physics(records: List[Dict], dataset_name: str) -> List[Dict[str, Any]]:
    """Check reference answers against physics laws (Born rule, no-communication, NISQ, etc.)."""
    flags = []

    for idx, r in enumerate(records, start=1):
        q = r["user"]
        a = r["assistant"]
        q_low = q.lower()
        a_low = a.lower()

        # Check: P(0) = 0.36 => P(1) must be 0.64
        if "0.36" in q:
            if "0.64" not in a:
                flags.append({
                    "dataset": dataset_name,
                    "index": idx,
                    "question": q,
                    "issue": "Born rule complement calculation: P(0)=0.36 must result in P(1)=0.64."
                })

        # Check: sqrt(3)/2 |0> + 1/2 |1> probabilities
        if "√3/2" in q and "p(0)" in q_low:
            if not ("75%" in a or "3/4" in a or "0.75" in a):
                flags.append({
                    "dataset": dataset_name,
                    "index": idx,
                    "question": q,
                    "issue": "Probability P(0) for √3/2 amplitude must equal 75% (3/4)."
                })

        # Check: Entanglement must not claim faster than light communication
        if "entanglement" in q_low or "faster than light" in q_low or "instant messaging" in q_low:
            if "cannot" not in a_low and "not" not in a_low and "no " not in a_low:
                flags.append({
                    "dataset": dataset_name,
                    "index": idx,
                    "question": q,
                    "issue": "Answer fails to reject faster-than-light communication."
                })

        # Check: Bell state (|00> + |11>)/sqrt(2) outcomes
        if "bell state" in q_low and "(|00⟩+|11⟩)" in q:
            if not ("00" in a and "11" in a and ("50%" in a or "1/2" in a or "half" in a)):
                flags.append({
                    "dataset": dataset_name,
                    "index": idx,
                    "question": q,
                    "issue": "Bell state outcomes must be specified as 00 and 11 each with probability 1/2."
                })

    return flags


def check_hardcoded_eval_leakage() -> List[str]:
    """Verify whether eval answers are hardcoded into application source files."""
    findings = []
    # Key terms from eval.jsonl
    eval_specific_terms = ["0.36", "0.64", "instant messaging"]
    src_files = list((PROJECT_ROOT / "backend").rglob("*.py"))

    for fpath in src_files:
        if "tests" in str(fpath) or "scripts" in str(fpath):
            continue
        try:
            content = fpath.read_text(encoding="utf-8")
            for term in eval_specific_terms:
                if term in content:
                    findings.append(f"Hardcoded eval term '{term}' found in {fpath.relative_to(PROJECT_ROOT)}")
        except Exception:
            pass

    return findings


def run_full_dataset_audit() -> Dict[str, Any]:
    """Execute complete dataset audit and print clean human-readable report."""
    print("=" * 78)
    print("  QUANTUM COMPUTING DATASET AUDIT & LEAKAGE VERIFICATION SUITE")
    print("=" * 78)

    train_rep = parse_and_validate_dataset(TRAIN_PATH)
    eval_rep = parse_and_validate_dataset(EVAL_PATH)

    print(f"\n1. DATASET INVENTORY:")
    print(f"  • train.jsonl: {train_rep['valid_records']} valid records, {train_rep['total_lines']} total lines.")
    print(f"  • eval.jsonl : {eval_rep['valid_records']} valid records, {eval_rep['total_lines']} total lines.")

    # Schema & Syntax
    print(f"\n2. SYNTAX & SCHEMA VALIDATION:")
    print(f"  • train.jsonl syntax errors: {len(train_rep['syntax_errors'])}, schema errors: {len(train_rep['schema_errors'])}")
    print(f"  • eval.jsonl syntax errors : {len(eval_rep['syntax_errors'])}, schema errors: {len(eval_rep['schema_errors'])}")

    # Duplicates within sets
    print(f"\n3. INTERNAL DUPLICATES:")
    print(f"  • train.jsonl duplicates: {len(train_rep['exact_duplicates'])}")
    print(f"  • eval.jsonl duplicates : {len(eval_rep['exact_duplicates'])}")

    # Cross-dataset overlap
    overlap = check_cross_dataset_overlap(train_rep["records"], eval_rep["records"])
    print(f"\n4. CROSS-DATASET LEAKAGE & OVERLAP:")
    print(f"  • Exact cross-dataset overlap: {len(overlap['exact_leakages'])}")
    if overlap["exact_leakages"]:
        for lk in overlap["exact_leakages"]:
            print(f"    ❌ Exact Leakage: Eval #{lk['eval_index']} \"{lk['eval_query']}\" <==> Train #{lk['train_index']} \"{lk['train_query']}\"")
    else:
        print(f"    ✓ Zero exact query overlaps detected between train.jsonl and eval.jsonl.")

    print(f"  • Potential near-duplicates / paraphrased pairs (Jaccard >= 0.55): {len(overlap['near_duplicates'])}")
    for nd in overlap["near_duplicates"]:
        print(f"    ⚠️  [Sim: {nd['similarity']:.2f}] Eval #{nd['eval_index']} \"{nd['eval_query']}\"")
        print(f"                     Train #{nd['train_index']} \"{nd['train_query']}\"")

    # Physics validity
    train_phys = verify_ground_truth_physics(train_rep["records"], "train.jsonl")
    eval_phys = verify_ground_truth_physics(eval_rep["records"], "eval.jsonl")
    all_phys_flags = train_phys + eval_phys

    print(f"\n5. PHYSICS GROUND TRUTH VALIDATION:")
    print(f"  • Reference physics discrepancies: {len(all_phys_flags)}")
    if all_phys_flags:
        for fl in all_phys_flags:
            print(f"    ❌ {fl['dataset']} #{fl['index']}: {fl['issue']}")
    else:
        print(f"    ✓ All examined numerical probabilities, state properties, and refutations are physically sound.")

    # Hardcoded eval answers in source code
    hardcoded = check_hardcoded_eval_leakage()
    print(f"\n6. SOURCE CODE HARDCODING CHECK:")
    print(f"  • Eval-specific constants hardcoded in core application code: {len(hardcoded)}")
    if hardcoded:
        for hc in hardcoded:
            print(f"    ⚠️  {hc}")
    else:
        print(f"    ✓ No evaluation question answers are hardcoded in core backend services.")

    print("\n" + "=" * 78)
    audit_passed = (
        len(train_rep["syntax_errors"]) == 0
        and len(eval_rep["syntax_errors"]) == 0
        and len(train_rep["schema_errors"]) == 0
        and len(eval_rep["schema_errors"]) == 0
        and len(overlap["exact_leakages"]) == 0
        and len(all_phys_flags) == 0
    )
    print(f"  AUDIT STATUS: {'PASSED' if audit_passed else 'ACTION REQUIRED'}")
    print("=" * 78)

    return {
        "train": train_rep,
        "eval": eval_rep,
        "overlap": overlap,
        "physics_flags": all_phys_flags,
        "hardcoded_in_code": hardcoded,
        "audit_passed": audit_passed
    }


if __name__ == "__main__":
    res = run_full_dataset_audit()
    if not res["audit_passed"]:
        sys.exit(1)
