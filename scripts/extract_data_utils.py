"""Extract, normalize, clean, and validate all 6 categories of training data across the 4 quantum topics.
"""
import os
import sys
import json
import re
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Tuple, Set

sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(".").resolve()
TOPICS = ["1.1", "1.2", "1.3", "1.4"]
TOPIC_NAMES = {
    "1.1": "What Is Quantum Computing?",
    "1.2": "Classical vs Quantum Computing",
    "1.3": "Quantum Computing Applications",
    "1.4": "Quantum Computers vs Quantum Simulators"
}

def normalize_text(text: str) -> str:
    """Normalize whitespace and common quantum notation for duplicate detection."""
    t = text.lower().strip()
    t = t.replace("√3/2", "sqrt3_2").replace("1/2", "half").replace("1/√2", "inv_sqrt2")
    t = t.replace("|0⟩", "|0>").replace("|1⟩", "|1>").replace("|00⟩", "|00>").replace("|11⟩", "|11>")
    t = t.replace("’", "'").replace("“", '"').replace("”", '"')
    t = re.sub(r"[^\w\s|><+\-=]", "", t)
    return re.sub(r"\s+", " ", t).strip()

def jaccard_similarity(str_a: str, str_b: str) -> float:
    set_a = set(normalize_text(str_a).split())
    set_b = set(normalize_text(str_b).split())
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)

print("Extractor utility ready.")
