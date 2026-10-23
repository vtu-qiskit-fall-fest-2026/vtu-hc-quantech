import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

def count_json(path):
    if not os.path.exists(path):
        return 0, {}
    with open(path, "r", encoding="utf-8") as f:
        d = json.load(f)
    if isinstance(d, list):
        return len(d), {"root_list": len(d)}
    counts = {}
    total = 0
    for k, v in d.items():
        if isinstance(v, list):
            counts[k] = len(v)
            total += len(v)
    return total, counts

def count_jsonl(path):
    if not os.path.exists(path):
        return 0
    return sum(1 for line in open(path, "r", encoding="utf-8") if line.strip())

print("==================== SUMMARY TABLE BY TOPIC ====================")
print(f"{'Topic':<8} | {'Concepts':<10} | {'Examples':<10} | {'Misconceptions':<15} | {'Assessments':<12} | {'GT Rules':<10} | {'Eval QA':<10} | {'Train QA':<10}")
print("-" * 100)

for topic in ["1.1", "1.2", "1.3", "1.4"]:
    folder = os.path.join("backend", "knowledge", "topics", topic)
    raw_folder = f"topic_{topic.replace('.', '_')}"
    
    # Try backend folder first, else raw folder
    c_path = os.path.join(folder, "concepts.json")
    if not os.path.exists(c_path):
        c_path = os.path.join(raw_folder, "knowledge.json")
    c_cnt, _ = count_json(c_path)
    
    e_path = os.path.join(folder, "examples.json")
    e_cnt, _ = count_json(e_path)
    
    m_path = os.path.join(folder, "misconceptions.json")
    m_cnt, _ = count_json(m_path)
    
    a_path = os.path.join(folder, "assessments.json")
    a_cnt, _ = count_json(a_path)
    
    gt_path = os.path.join(folder, "ground_truth.json")
    gt_cnt, _ = count_json(gt_path)
    
    ev_json = os.path.join(folder, "eval.json")
    ev_cnt, _ = count_json(ev_json)
    ev_jsonl = os.path.join(raw_folder, "eval.jsonl")
    ev_cnt += count_jsonl(ev_jsonl)
    
    tr_jsonl = os.path.join(raw_folder, "train.jsonl")
    tr_cnt = count_jsonl(tr_jsonl)
    
    print(f"Topic {topic:<3} | {c_cnt:<10} | {e_cnt:<10} | {m_cnt:<15} | {a_cnt:<12} | {gt_cnt:<10} | {ev_cnt:<10} | {tr_cnt:<10}")

print("\n==================== DETAILS PER FILE ====================")
for topic in ["1.1", "1.2", "1.3", "1.4"]:
    folder = os.path.join("backend", "knowledge", "topics", topic)
    print(f"\n--- Topic {topic} in {folder} ---")
    for f in ["concepts.json", "examples.json", "misconceptions.json", "assessments.json", "ground_truth.json", "eval.json"]:
        p = os.path.join(folder, f)
        tot, breakdown = count_json(p)
        print(f"  {f:<20}: total={tot:<4} breakdown={breakdown}")
