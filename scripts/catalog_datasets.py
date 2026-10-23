import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

for topic in ["1.1", "1.2", "1.3", "1.4"]:
    print(f"\n==================== TOPIC {topic} INVENTORY ====================")
    tdir = f"topic_{topic.replace('.', '_')}"
    bdir = os.path.join("backend", "knowledge", "topics", topic)
    
    for folder in [tdir, bdir]:
        if os.path.exists(folder):
            print(f"\n--- Directory: {folder} ---")
            for fname in sorted(os.listdir(folder)):
                fpath = os.path.join(folder, fname)
                if fname.endswith(".json"):
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        if isinstance(data, dict):
                            for k, v in data.items():
                                if isinstance(v, list):
                                    print(f"  {fname:<20} key '{k}': {len(v)} items")
                                elif isinstance(v, dict):
                                    print(f"  {fname:<20} dict '{k}': {len(v)} keys")
                                else:
                                    print(f"  {fname:<20} '{k}': {type(v).__name__}")
                        elif isinstance(data, list):
                            print(f"  {fname:<20} list: {len(data)} items")
                    except Exception as e:
                        print(f"  {fname:<20} error: {e}")
                elif fname.endswith(".jsonl"):
                    count = sum(1 for line in open(fpath, "r", encoding="utf-8") if line.strip())
                    print(f"  {fname:<20} JSONL lines: {count}")
                elif fname.endswith(".docx"):
                    print(f"  {fname:<20} DOCX: {os.path.getsize(fpath)} bytes")
                elif fname.endswith(".md"):
                    print(f"  {fname:<20} MD: {os.path.getsize(fpath)} bytes")
