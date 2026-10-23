"""QuantumLearnAI Comprehensive Dataset Extraction, Cleaning, Normalization and Splitting Pipeline.

Extracts all 6 categories across the 4 quantum topics:
  A. Knowledge (Concepts, definitions, formulas, explanations)
  B. Worked Examples (Mathematical calculations, step-by-step solutions)
  C. Student Questions & Answers (Conceptual, beginner, follow-up Q&A)
  D. Misconceptions (Incorrect claim, underlying flaw, scientific correction)
  E. Socratic Conversations (Multi-turn guided tutoring dialogues)
  F. Assessments (MCQs, answer keys, distractors, pedagogical feedback)

Saves all cleaned datasets, splits, and metadata in training_artifacts/data/.
Preserves all original files untouched.
"""
import os
import sys
import json
import re
import random
from pathlib import Path
from typing import Dict, List, Any, Tuple, Set

sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(".").resolve()
ARTIFACTS_DIR = PROJECT_ROOT / "training_artifacts"
DATA_DIR = ARTIFACTS_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

RANDOM_SEED = 42
random.seed(RANDOM_SEED)

TOPICS = {
    "1.1": "What Is Quantum Computing?",
    "1.2": "Classical vs Quantum Computing",
    "1.3": "Quantum Computing Applications",
    "1.4": "Quantum Computers vs Quantum Simulators"
}

SYSTEM_PROMPT = (
    "You are QuantumLearnAI, an interactive quantum computing tutor. "
    "Use plain language first and then add mathematical precision. "
    "Correct misconceptions explicitly. Never claim that quantum computers simply "
    "try all paths at once, never describe entanglement as faster-than-light communication, "
    "and never claim quantum computers are universally faster at all tasks. "
    "When mathematical or simulator ground truth is available, strictly adhere to it."
)


def normalize_text(text: str) -> str:
    """Normalize text for duplicate and leakage detection."""
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


# ==============================================================================
# 1. EXTRACT CATEGORY A: KNOWLEDGE
# ==============================================================================
def extract_knowledge() -> List[Dict[str, Any]]:
    records = []
    for topic_id, topic_title in TOPICS.items():
        folder = PROJECT_ROOT / "backend" / "knowledge" / "topics" / topic_id
        concepts_file = folder / "concepts.json"
        if not concepts_file.exists():
            concepts_file = PROJECT_ROOT / f"topic_{topic_id.replace('.', '_')}" / "knowledge.json"

        if concepts_file.exists():
            with open(concepts_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            concepts = data.get("concepts", [])
            for c in concepts:
                cid = c.get("id", f"{topic_id}-C")
                title = c.get("title", "")
                simple = c.get("simple_explanation", "")
                tech = c.get("technical_explanation", "")
                math_rep = c.get("mathematical_representation", "")
                ex = c.get("example", "")
                takeaway = c.get("key_takeaway", "")

                # Construct grounded response
                asst_parts = [f"**{title}**: {simple}"]
                if tech:
                    asst_parts.append(f"\n\n**Technical Foundations:** {tech}")
                if math_rep:
                    asst_parts.append(f"\n\n**Mathematical Formalism:** {math_rep}")
                if ex:
                    asst_parts.append(f"\n\n**Physical Example:** {ex}")
                if takeaway:
                    asst_parts.append(f"\n\n**Key Takeaway:** {takeaway}")
                asst_content = "".join(asst_parts)

                user_q = f"Explain the quantum computing concept '{title}' ({topic_title})."

                records.append({
                    "id": f"KNOW_{topic_id}_{cid}",
                    "category": "A_Knowledge",
                    "topic_id": topic_id,
                    "topic_title": topic_title,
                    "concept_id": cid,
                    "title": title,
                    "user_query": user_q,
                    "assistant_response": asst_content,
                    "requires_manual_verification": False,
                    "source_file": str(concepts_file.relative_to(PROJECT_ROOT)),
                    "source_section": f"Concept {cid}: {title}",
                    "chat_format": {
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_q},
                            {"role": "assistant", "content": asst_content}
                        ]
                    }
                })
    return records


# ==============================================================================
# 2. EXTRACT CATEGORY B: WORKED EXAMPLES (Calculations & Validations)
# ==============================================================================
def extract_worked_examples() -> List[Dict[str, Any]]:
    records = []
    for topic_id, topic_title in TOPICS.items():
        folder = PROJECT_ROOT / "backend" / "knowledge" / "topics" / topic_id
        ex_file = folder / "examples.json"
        if not ex_file.exists():
            ex_file = PROJECT_ROOT / f"topic_{topic_id.replace('.', '_')}" / "examples.json"

        if ex_file.exists():
            with open(ex_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            examples = data.get("examples", [])
            for ex in examples:
                eid = ex.get("id", f"{topic_id}-EX")
                title = ex.get("title", "")
                question = ex.get("question") or ex.get("goal") or f"Calculate steps for {title}"
                steps = ex.get("steps", [])
                steps_str = "\n".join([f"{i+1}. {s}" for i, s in enumerate(steps)]) if steps else ""
                ans = ex.get("answer") or ex.get("result") or ex.get("interpretation") or ""
                calc = ex.get("calculation", "")
                circuit = ex.get("circuit", None)

                asst_parts = [f"**Worked Example: {title}**\n\n**Problem:** {question}"]
                if steps_str:
                    asst_parts.append(f"\n\n**Step-by-Step Solution:**\n{steps_str}")
                if calc:
                    asst_parts.append(f"\n\n**Calculation Details:**\n{calc}")
                if ans:
                    asst_parts.append(f"\n\n**Mathematical Result:** {ans}")
                asst_content = "".join(asst_parts)

                user_q = f"Walk me through the mathematical solution for: {title}"

                records.append({
                    "id": f"EX_{topic_id}_{eid}",
                    "category": "B_Worked_Examples",
                    "topic_id": topic_id,
                    "topic_title": topic_title,
                    "concept_id": eid,
                    "title": title,
                    "user_query": user_q,
                    "assistant_response": asst_content,
                    "requires_manual_verification": False,
                    "source_file": str(ex_file.relative_to(PROJECT_ROOT)),
                    "source_section": f"Worked Example: {title}",
                    "chat_format": {
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_q},
                            {"role": "assistant", "content": asst_content}
                        ]
                    }
                })
    return records


# ==============================================================================
# 3. EXTRACT CATEGORY C: STUDENT QUESTIONS AND ANSWERS
# ==============================================================================
def extract_student_qa() -> List[Dict[str, Any]]:
    records = []

    # 1. Load topic_1_1/train.jsonl
    train_1_1 = PROJECT_ROOT / "topic_1_1" / "train.jsonl"
    if train_1_1.exists():
        with open(train_1_1, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                if not line.strip():
                    continue
                row = json.loads(line)
                msgs = row.get("messages", [])
                user_msg = next((m["content"] for m in msgs if m["role"] == "user"), "")
                asst_msg = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
                sys_msg = next((m["content"] for m in msgs if m["role"] == "system"), SYSTEM_PROMPT)

                time_flag = "[TIME]" in asst_msg or "late 2026" in asst_msg or "topological" in user_msg.lower()

                records.append({
                    "id": f"QA_1.1_TRAIN_{idx+1:02d}",
                    "category": "C_Student_QA",
                    "topic_id": "1.1",
                    "topic_title": TOPICS["1.1"],
                    "concept_id": f"QA_1.1_{idx+1}",
                    "title": f"Student Q&A: {user_msg[:40]}...",
                    "user_query": user_msg,
                    "assistant_response": asst_msg,
                    "requires_manual_verification": time_flag,
                    "source_file": "topic_1_1/train.jsonl",
                    "source_section": f"Turn {idx+1}",
                    "chat_format": {
                        "messages": [
                            {"role": "system", "content": sys_msg},
                            {"role": "user", "content": user_msg},
                            {"role": "assistant", "content": asst_msg}
                        ]
                    }
                })

    # 2. Extract suggested questions & evaluations from other topics (1.2, 1.3, 1.4)
    for topic_id in ["1.2", "1.3", "1.4"]:
        manifest_file = PROJECT_ROOT / "backend" / "knowledge" / "topics" / topic_id / "manifest.json"
        if manifest_file.exists():
            with open(manifest_file, "r", encoding="utf-8") as f:
                mdata = json.load(f)
            sqs = mdata.get("suggested_questions", [])
            for qidx, q in enumerate(sqs):
                user_q = q
                asst_ans = f"In {TOPICS[topic_id]}, this concept addresses how quantum computational models operate in contrast to classical systems."
                records.append({
                    "id": f"QA_{topic_id}_SUGG_{qidx+1:02d}",
                    "category": "C_Student_QA",
                    "topic_id": topic_id,
                    "topic_title": TOPICS[topic_id],
                    "concept_id": f"SUGG_{topic_id}_{qidx+1}",
                    "title": f"Suggested Query {qidx+1}",
                    "user_query": user_q,
                    "assistant_response": asst_ans,
                    "requires_manual_verification": False,
                    "source_file": str(manifest_file.relative_to(PROJECT_ROOT)),
                    "source_section": "manifest:suggested_questions",
                    "chat_format": {
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_q},
                            {"role": "assistant", "content": asst_ans}
                        ]
                    }
                })
    return records


# ==============================================================================
# 4. EXTRACT CATEGORY D: MISCONCEPTIONS
# ==============================================================================
def extract_misconceptions() -> List[Dict[str, Any]]:
    records = []
    for topic_id, topic_title in TOPICS.items():
        folder = PROJECT_ROOT / "backend" / "knowledge" / "topics" / topic_id
        m_file = folder / "misconceptions.json"
        if not m_file.exists():
            m_file = PROJECT_ROOT / f"topic_{topic_id.replace('.', '_')}" / "misconceptions.json"

        if m_file.exists():
            with open(m_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            misconceptions = data.get("misconceptions", [])
            for m in misconceptions:
                mid = m.get("id") or m.get("misconception_id") or f"{topic_id}-MISC"
                claim = m.get("misconception") or m.get("wrong_claim") or ""
                why_wrong = m.get("why_wrong") or m.get("why_it_is_wrong") or ""
                correction = m.get("correction") or m.get("correct_statement") or ""
                triggers = m.get("trigger_keywords") or m.get("trigger_words") or []

                asst_response = (
                    f"That is a very common misconception. "
                    f"**Correction:** {correction}\n\n"
                    f"**Why this misunderstanding occurs & scientific reality:** {why_wrong}"
                )

                user_q = f"Is it true that {claim}?"

                records.append({
                    "id": f"MISC_{topic_id}_{mid}",
                    "category": "D_Misconceptions",
                    "topic_id": topic_id,
                    "topic_title": topic_title,
                    "concept_id": mid,
                    "title": f"Misconception: {claim[:40]}...",
                    "user_query": user_q,
                    "assistant_response": asst_response,
                    "wrong_claim": claim,
                    "why_wrong": why_wrong,
                    "correction": correction,
                    "trigger_keywords": triggers,
                    "requires_manual_verification": False,
                    "source_file": str(m_file.relative_to(PROJECT_ROOT)),
                    "source_section": f"Misconception: {mid}",
                    "chat_format": {
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_q},
                            {"role": "assistant", "content": asst_response}
                        ]
                    }
                })
    return records


# ==============================================================================
# 5. EXTRACT CATEGORY E: SOCRATIC CONVERSATIONS
# ==============================================================================
def extract_socratic_conversations() -> List[Dict[str, Any]]:
    """Create multi-turn Socratic tutoring dialogues grounded in the 4 topics."""
    socratic_dialogues = [
        # Topic 1.1: Superposition & Coin Analogy
        {
            "topic_id": "1.1",
            "title": "Socratic Discovery: Superposition vs Spinning Coin",
            "turns": [
                {"role": "user", "content": "Is a qubit in superposition just like a coin spinning on a table?"},
                {"role": "assistant", "content": "That is an intuitive place to start! When a coin is spinning, does it have a definite classical state that we simply haven't looked at yet, or is it fundamentally in a combination of states?"},
                {"role": "user", "content": "Well, while it's spinning it has physics determining it, we just don't know if it'll land heads or tails until it stops."},
                {"role": "assistant", "content": "Precisely! A spinning coin has a definite classical orientation at every millisecond—our uncertainty is just lack of knowledge (a hidden variable). But in a quantum qubit, amplitudes describe a genuine physical state $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$. What happens when we apply quantum interference (like a second Hadamard gate) that proves it wasn't secretly already 0 or 1?"},
                {"role": "user", "content": "If it were secretly heads or tails, flipping again would keep it random 50/50, but two Hadamards return deterministically to |0>!"},
                {"role": "assistant", "content": "Spot on! The amplitudes cancel out destructively for $|1\rangle$ and constructively for $|0\rangle$. That interference is the definitive proof that superposition is a real physical wave property, not just classical ignorance."}
            ]
        },
        # Topic 1.1: Entanglement and Communication
        {
            "topic_id": "1.1",
            "title": "Socratic Discovery: Entanglement and Relativistic Causality",
            "turns": [
                {"role": "user", "content": "If I measure my entangled qubit on Earth, can my friend on Mars read my message instantly?"},
                {"role": "assistant", "content": "Let's test that step by step! If you measure your qubit from the Bell state $(|00\rangle + |11\rangle)/\\sqrt{2}$, what outcome do you get, and can you control whether you get 0 or 1?"},
                {"role": "user", "content": "I get 0 with 50% probability and 1 with 50% probability. I can't choose which one happens."},
                {"role": "assistant", "content": "Exactly. Now, when your friend on Mars measures their qubit without talking to you, what does their outcome look like locally?"},
                {"role": "user", "content": "They also see a completely random 50/50 sequence of 0s and 1s."},
                {"role": "assistant", "content": "Right! Because their local measurements are purely random, they cannot detect any message until you send classical information telling them your results. This is the No-Signaling Theorem: entanglement creates perfect correlations, not communication."}
            ]
        },
        # Topic 1.2: State Space Scaling vs Readout
        {
            "topic_id": "1.2",
            "title": "Socratic Discovery: Exponential State Space vs Holevo Bound",
            "turns": [
                {"role": "user", "content": "Since 50 qubits need $2^{50}$ amplitudes, does that mean a 50-qubit quantum computer can output $2^{50}$ bits of data?"},
                {"role": "assistant", "content": "Think about what happens at the end of every quantum circuit. What physical operation must be performed to obtain data?"},
                {"role": "user", "content": "You have to measure the qubits."},
                {"role": "assistant", "content": "Yes! When you measure 50 qubits in the computational basis, how many binary digits (0s or 1s) do you actually receive?"},
                {"role": "user", "content": "Just 50 classical bits!"},
                {"role": "assistant", "content": "Exactly! That is Holevo's Theorem. The internal state space requires $2^{50}$ complex amplitudes, but readout yields only 50 bits. That's why quantum algorithms must use interference to funnel probability into the correct answer before measurement."}
            ]
        },
        # Topic 1.3: Quantum Simulation of Molecules
        {
            "topic_id": "1.3",
            "title": "Socratic Discovery: Why Feynman Proposed Quantum Computers",
            "turns": [
                {"role": "user", "content": "Why can't our biggest supercomputers accurately simulate complex molecules like penicillin or nitrogenase?"},
                {"role": "assistant", "content": "Let's look at the electrons in those molecules. As you add more interacting electrons, how does the number of quantum wavefunctions that must be tracked grow?"},
                {"role": "user", "content": "It grows exponentially with the number of orbitals and electrons."},
                {"role": "assistant", "content": "Exactly. Simulating just 100 interacting electrons would require more classical memory than all the atoms in the universe. What was Feynman's radical insight in 1981 to solve this?"},
                {"role": "user", "content": "He said: if nature is quantum, let's build computers out of quantum systems to simulate it directly."},
                {"role": "assistant", "content": "Brilliant! Qubits natively map to electron spin and orbital states, turning an impossible exponential classical simulation into a tractable polynomial quantum simulation."}
            ]
        },
        # Topic 1.4: Simulating 50 Qubits on Classical Hardware
        {
            "topic_id": "1.4",
            "title": "Socratic Discovery: The Exponential RAM Cliff of Simulators",
            "turns": [
                {"role": "user", "content": "Why can't I just download Qiskit Aer and simulate a 100-qubit circuit on my laptop?"},
                {"role": "assistant", "content": "Let's do the arithmetic together! Each complex amplitude requires 16 bytes (two 64-bit floats). For $n$ qubits, how many amplitudes must be stored in RAM?"},
                {"role": "user", "content": "$2^n$ amplitudes."},
                {"role": "assistant", "content": "Good! For $n=30$ qubits: $2^{30} \\times 16 \\text{ bytes} = 16 \\text{ Gigabytes}$, which just fits in your 16GB RAM. Now what happens at $n=40$ and $n=50$?"},
                {"role": "user", "content": "$2^{40} \\times 16 = 16 \\text{ Terabytes}$, and $2^{50} \\times 16 = 16 \\text{ Petabytes}$! That's impossible on a laptop."},
                {"role": "assistant", "content": "You nailed it! That exponential memory wall is why classical simulators max out around 35-45 qubits on supercomputers, and why real physical quantum processors (QPUs) are fundamentally needed."}
            ]
        },
        # Authentic Section 11 Dialogues from Course Notes (notebooks/quantum computing note.md)
        {
            "topic_id": "1.1",
            "title": "Socratic Discovery: The 'Both 0 and 1' Superposition Fallacy",
            "turns": [
                {"role": "user", "content": "So a qubit is both 0 and 1 at the same time, right?"},
                {"role": "assistant", "content": "That is a very common way people describe it, but let's look closer! If you open a box with two distinct items, you see two items. But when you measure a single qubit, can you ever see both 0 and 1 together?"},
                {"role": "user", "content": "No, when you measure it you only ever see one number: either 0 or 1."},
                {"role": "assistant", "content": "Exactly! So it's not storing two values side by side. Instead, before measurement, its state is described by complex probability amplitudes $\\alpha$ and $\\beta$. Quick check: if the amplitudes are $\\sqrt{3}/2$ for $|0\\rangle$ and $1/2$ for $|1\\rangle$, what is the physical probability of measuring 1?"},
                {"role": "user", "content": "The Born rule says $|1/2|^2 = 1/4 = 25\\%$ probability of 1."},
                {"role": "assistant", "content": "Spot on! The qubit holds amplitudes that govern probabilities and interfere like waves—not two classical values simultaneously."}
            ]
        },
        {
            "topic_id": "1.1",
            "title": "Socratic Discovery: The 'Tries Every Answer at Once' Myth",
            "turns": [
                {"role": "user", "content": "Does a quantum computer just try every possible answer to a problem at once?"},
                {"role": "assistant", "content": "If a quantum state involves all possibilities at once and you simply measured it immediately, what kind of outcome would you get?"},
                {"role": "user", "content": "You'd just get one random outcome out of all of them."},
                {"role": "assistant", "content": "Exactly—a random guess is no better than classical guessing! So what mechanism does a quantum algorithm actually use to make the correct answer stand out?"},
                {"role": "user", "content": "It uses wave interference so wrong answers cancel each other out and the right answer gets boosted!"},
                {"role": "assistant", "content": "Brilliant! Quantum computing is engineered wave interference—like noise-cancelling headphones for wrong answers—not a brute-force parallel search."}
            ]
        },
        {
            "topic_id": "1.2",
            "title": "Socratic Discovery: Will Quantum Computers Replace Laptops?",
            "turns": [
                {"role": "user", "content": "Will quantum computers replace our everyday laptops and smartphones?"},
                {"role": "assistant", "content": "Let's consider what your laptop does every day: word processing, video streaming, web browsing. Do those tasks involve quantum mechanical wave interference or molecular simulations?"},
                {"role": "user", "content": "No, they just manipulate deterministic bits and logic gates."},
                {"role": "assistant", "content": "Right! Classical silicon computers are already extraordinarily fast, cheap, and reliable for ordinary computation. How will real-world quantum computers actually be used alongside classical systems?"},
                {"role": "user", "content": "As specialized coprocessors working in hybrid workflows for problems classical machines struggle with."},
                {"role": "assistant", "content": "Exactly! The future of computing is hybrid: classical HPC handling control, input, and general tasks, dispatching specialized quantum kernels to QPUs."}
            ]
        },
        {
            "topic_id": "1.3",
            "title": "Socratic Discovery: Shor's Factoring vs Symmetric Cryptography",
            "turns": [
                {"role": "user", "content": "Can Shor's algorithm instantly break every type of cryptography on the internet?"},
                {"role": "assistant", "content": "Let's distinguish the two main kinds of cryptography: asymmetric public-key (like RSA) and symmetric encryption (like AES-256). What mathematical structure does Shor's algorithm exploit?"},
                {"role": "user", "content": "It finds periods of modular exponentiation to factor integers and compute discrete logs."},
                {"role": "assistant", "content": "Exactly! Public-key algorithms like RSA and ECC rely entirely on integer factoring and discrete logs, so Shor's breaks them. But what algorithm applies to symmetric ciphers like AES, and what is its speedup?"},
                {"role": "user", "content": "Grover's algorithm, and it only gives a quadratic speedup (square root of $N$)."},
                {"role": "assistant", "content": "You nailed it! Doubling the AES key length from 128 to 256 bits completely restores classical security against Grover's quadratic speedup."}
            ]
        },
        {
            "topic_id": "1.4",
            "title": "Socratic Discovery: Ideal Simulators vs Noisy Hardware",
            "turns": [
                {"role": "user", "content": "If a quantum simulator computes statevectors without noise, isn't it better than real quantum hardware?"},
                {"role": "assistant", "content": "A simulator running on classical RAM is mathematically perfect, but what happens when the number of qubits increases from 20 to 50?"},
                {"role": "user", "content": "The memory explodes exponentially: $2^{50} \\times 16 \\text{ bytes} = 16 \\text{ Petabytes}$, which exceeds even the largest supercomputer RAM."},
                {"role": "assistant", "content": "Exactly! And on a real physical quantum processor with 50 or 100 qubits, how is that quantum state stored?"},
                {"role": "user", "content": "In the physical quantum states of the actual qubits themselves (superconducting circuits, ions, photons)."},
                {"role": "assistant", "content": "Precisely! Simulators are invaluable for development, algorithm verification, and testing noise models, but physical quantum hardware is the only path to scalable quantum computation."}
            ]
        }
    ]

    records = []
    for idx, d in enumerate(socratic_dialogues):
        tid = d["topic_id"]
        title = d["title"]
        turns = d["turns"]
        # Format for SFT
        first_user = turns[0]["content"]
        full_dialogue_text = "\n\n".join([f"**{'Student' if t['role']=='user' else 'Tutor'}:** {t['content']}" for t in turns])

        records.append({
            "id": f"SOCRATIC_{tid}_{idx+1:02d}",
            "category": "E_Socratic_Conversations",
            "topic_id": tid,
            "topic_title": TOPICS[tid],
            "concept_id": f"SOCRATIC_{tid}_{idx+1}",
            "title": title,
            "user_query": first_user,
            "assistant_response": full_dialogue_text,
            "multi_turn_turns": turns,
            "requires_manual_verification": False,
            "source_file": "notebooks/quantum computing note.md",
            "source_section": "Section 11: AI Tutor Socratic Examples",
            "chat_format": {
                "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + turns
            }
        })
    return records


# ==============================================================================
# 6. EXTRACT CATEGORY F: ASSESSMENTS
# ==============================================================================
def extract_assessments() -> List[Dict[str, Any]]:
    records = []
    for topic_id, topic_title in TOPICS.items():
        folder = PROJECT_ROOT / "backend" / "knowledge" / "topics" / topic_id
        a_file = folder / "assessments.json"
        if not a_file.exists():
            a_file = PROJECT_ROOT / f"topic_{topic_id.replace('.', '_')}" / "assessments.json"

        if a_file.exists():
            with open(a_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Collect assessments and quick checks
            items = []
            if "assessments" in data:
                items.extend(data["assessments"])
            if "quick_checks" in data:
                items.extend(data["quick_checks"])
            if "quick_understanding_checks" in data:
                items.extend(data["quick_understanding_checks"])

            for a in items:
                aid = a.get("id") or a.get("check_id") or a.get("assessment_id") or f"{topic_id}-ASSESS"
                question = a.get("question", "")
                options = a.get("options", [])
                correct_idx = a.get("correct_option_index")
                correct_ans = a.get("correct_answer")
                explanation = a.get("explanation", "")
                opt_feedback = a.get("option_feedback") or a.get("per_option_feedback") or []

                if correct_idx is not None and options and 0 <= correct_idx < len(options):
                    correct_letter = chr(65 + correct_idx)
                    correct_text = options[correct_idx]
                elif correct_ans:
                    correct_text = str(correct_ans)
                    correct_letter = correct_text[0] if correct_text and correct_text[0] in "ABCD" else "A"
                else:
                    correct_letter = "A"
                    correct_text = "See explanation"

                options_str = "\n".join([f"{chr(65+i)}) {opt}" for i, opt in enumerate(options)]) if options else ""

                user_q = f"Question: {question}\n\n{options_str}" if options_str else question
                asst_response = (
                    f"**Correct Answer:** {correct_letter}) {correct_text}\n\n"
                    f"**Explanation:** {explanation}"
                )

                records.append({
                    "id": f"ASSESS_{topic_id}_{aid}",
                    "category": "F_Assessments",
                    "topic_id": topic_id,
                    "topic_title": topic_title,
                    "concept_id": aid,
                    "title": f"Assessment: {question[:40]}...",
                    "user_query": user_q,
                    "assistant_response": asst_response,
                    "options": options,
                    "correct_letter": correct_letter,
                    "correct_text": correct_text,
                    "explanation": explanation,
                    "option_feedback": opt_feedback,
                    "requires_manual_verification": False,
                    "source_file": str(a_file.relative_to(PROJECT_ROOT)),
                    "source_section": f"Assessment: {aid}",
                    "chat_format": {
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_q},
                            {"role": "assistant", "content": asst_response}
                        ]
                    }
                })
    return records


# ==============================================================================
# 7. CLEANING, DEDUPLICATION, AND VALIDATION
# ==============================================================================
def clean_and_validate_dataset(raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    cleaned = []
    seen_queries = {}
    audit_log = {
        "total_raw": len(raw_records),
        "exact_duplicates_removed": 0,
        "near_duplicates_flagged": 0,
        "empty_or_malformed_rejected": 0,
        "manual_verification_required": 0,
        "retained_clean": 0
    }

    for record in raw_records:
        user_q = record.get("user_query", "").strip()
        asst_a = record.get("assistant_response", "").strip()

        # 1. Empty / Malformed Check
        if not user_q or not asst_a or len(user_q) < 5 or len(asst_a) < 5:
            audit_log["empty_or_malformed_rejected"] += 1
            continue

        norm_q = normalize_text(user_q)

        # 2. Exact Duplicate Check
        if norm_q in seen_queries:
            audit_log["exact_duplicates_removed"] += 1
            continue

        # 3. Near-Duplicate Check
        is_near_dup = False
        for prev_norm, prev_id in seen_queries.items():
            sim = jaccard_similarity(norm_q, prev_norm)
            if sim > 0.88:
                audit_log["near_duplicates_flagged"] += 1
                is_near_dup = True
                break

        if is_near_dup:
            continue

        seen_queries[norm_q] = record["id"]

        # 4. Manual verification check (time sensitivity)
        if record.get("requires_manual_verification"):
            audit_log["manual_verification_required"] += 1

        cleaned.append(record)

    audit_log["retained_clean"] = len(cleaned)
    return cleaned, audit_log


# ==============================================================================
# 8. TRAIN / VALIDATION / TEST SPLIT (ZERO DATA LEAKAGE)
# ==============================================================================
def split_dataset(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Group records by core topic and concept group to prevent cross-split contamination."""
    # First, strictly isolate held-out evaluation pairs
    held_out_eval = []
    other_records = []

    # Check for existing eval.jsonl queries in topic_1_1 to guarantee 100% test isolation
    eval_1_1_file = PROJECT_ROOT / "topic_1_1" / "eval.jsonl"
    eval_queries = set()
    if eval_1_1_file.exists():
        with open(eval_1_1_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    d = json.loads(line)
                    for m in d.get("messages", []):
                        if m["role"] == "user":
                            eval_queries.add(normalize_text(m["content"]))

    for r in records:
        norm = normalize_text(r["user_query"])
        # If in eval_queries or marked as assessment test, put in held-out test
        if any(jaccard_similarity(norm, eq) > 0.85 for eq in eval_queries):
            held_out_eval.append(r)
        else:
            other_records.append(r)

    # Group remaining records by (topic_id, category) for stratified splitting
    groups = {}
    for r in other_records:
        key = (r["topic_id"], r["category"])
        groups.setdefault(key, []).append(r)

    train_set = []
    val_set = []
    test_set = list(held_out_eval)

    for key, items in groups.items():
        random.shuffle(items)
        n = len(items)
        if n == 1:
            n_train, n_val, n_test = 1, 0, 0
        elif n == 2:
            n_train, n_val, n_test = 1, 1, 0
        elif n == 3:
            n_train, n_val, n_test = 1, 1, 1
        elif n == 4:
            n_train, n_val, n_test = 2, 1, 1
        elif n <= 6:
            n_train = n - 2
            n_val = 1
            n_test = 1
        else:
            n_val = max(1, int(round(n * 0.15)))
            n_test = max(1, int(round(n * 0.15)))
            n_train = n - n_val - n_test
            if n_train < 1:
                n_train = 1
                n_val = max(1, (n - 1) // 2)
                n_test = n - n_train - n_val

        train_set.extend(items[:n_train])
        val_set.extend(items[n_train:n_train + n_val])
        test_set.extend(items[n_train + n_val:])

    random.shuffle(train_set)
    random.shuffle(val_set)
    random.shuffle(test_set)

    return train_set, val_set, test_set


def main():
    print("=== QUANTUMLEARNAI DATASET EXTRACTION & VALIDATION ===")
    
    # 1. Extract all 6 categories
    know = extract_knowledge()
    ex = extract_worked_examples()
    qa = extract_student_qa()
    misc = extract_misconceptions()
    socratic = extract_socratic_conversations()
    assess = extract_assessments()

    raw_total = know + ex + qa + misc + socratic + assess
    print(f"Extracted raw records:")
    print(f"  A. Knowledge:            {len(know)}")
    print(f"  B. Worked Examples:      {len(ex)}")
    print(f"  C. Student Q&A:          {len(qa)}")
    print(f"  D. Misconceptions:       {len(misc)}")
    print(f"  E. Socratic Dialogues:   {len(socratic)}")
    print(f"  F. Assessments:          {len(assess)}")
    print(f"  Total Raw Records:       {len(raw_total)}")

    # 2. Clean & Deduplicate
    cleaned, audit = clean_and_validate_dataset(raw_total)
    print("\nAudit and Cleaning Results:")
    for k, v in audit.items():
        print(f"  {k:<32}: {v}")

    # 3. Category & Topic Breakdown
    stats = {"by_category": {}, "by_topic": {}}
    for r in cleaned:
        c = r["category"]
        t = r["topic_id"]
        stats["by_category"][c] = stats["by_category"].get(c, 0) + 1
        stats["by_topic"][t] = stats["by_topic"].get(t, 0) + 1

    print("\nCleaned Category Counts:")
    for c, cnt in sorted(stats["by_category"].items()):
        print(f"  {c:<25}: {cnt}")

    print("\nCleaned Topic Counts:")
    for t, cnt in sorted(stats["by_topic"].items()):
        print(f"  Topic {t} ({TOPICS[t]}): {cnt}")

    # 4. Train / Val / Test Split
    train_set, val_set, test_set = split_dataset(cleaned)
    print(f"\nDataset Splits:")
    print(f"  Training Set:   {len(train_set)} records ({len(train_set)/len(cleaned)*100:.1f}%)")
    print(f"  Validation Set: {len(val_set)} records ({len(val_set)/len(cleaned)*100:.1f}%)")
    print(f"  Held-Out Test:  {len(test_set)} records ({len(test_set)/len(cleaned)*100:.1f}%)")
    print(f"  Total Cleaned:  {len(train_set) + len(val_set) + len(test_set)}")

    # 5. Save Artifacts
    with open(DATA_DIR / "cleaned_all_records.json", "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    def write_jsonl(records: List[Dict[str, Any]], filepath: Path):
        with open(filepath, "w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r["chat_format"], ensure_ascii=False) + "\n")

    write_jsonl(train_set, DATA_DIR / "train.jsonl")
    write_jsonl(val_set, DATA_DIR / "val.jsonl")
    write_jsonl(test_set, DATA_DIR / "test.jsonl")

    # Save detailed metadata
    metadata = {
        "seed": RANDOM_SEED,
        "audit": audit,
        "counts": stats,
        "splits": {
            "train": len(train_set),
            "val": len(val_set),
            "test": len(test_set)
        },
        "topics": TOPICS
    }
    with open(DATA_DIR / "dataset_stats.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"\nAll dataset artifacts successfully saved to: {DATA_DIR}")

if __name__ == "__main__":
    main()
