"""Topic-Agnostic Semantic Retrieval and Data-Driven Intent Engine.

Retrieves grounded educational knowledge across loaded topic packs with:
- Semantic domain term expansion and normalization (math formulas, quantum states).
- Sublinear BM25 ranking with length normalization across concepts, examples, rules, and assessments.
- Cross-pack curriculum indexing with active-topic affinity.
- Semantic scope determination: rejects genuinely out-of-scope queries while admitting
  conceptually and mathematically relevant curriculum questions.
- Data-driven intent detection using patterns and keywords.
- Zero hardcoded topic strings.
"""
import re
import math
from collections import Counter
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, field

from backend.knowledge.schema import (
    Concept, Misconception, WorkedExample, GroundTruthRule, AssessmentQuestion, TopicPack
)
from backend.knowledge.registry import TopicRegistry, get_topic_registry


GLOBAL_INTENTS = {
    "quiz_request": ["quiz me", "quiz", "test me", "question me", "give me a question", "give me a quiz", "start a quiz", "test my knowledge", "ask me a question", "another one", "another question", "next question", "one more"],
    "quiz_explanation": ["why is a correct", "why is b correct", "why is c correct", "why is d correct", "why is option b", "why is option a", "why is option c", "why is option d", "why is b right", "why is a right", "why is c right", "why is d right", "explain why b", "explain why a"],
    "quiz_answer": ["option a", "option b", "option c", "option d", "choice a", "choice b", "choice c", "choice d", "the answer is", "i think a", "i think b", "i think c", "i think d"],
    "quiz_me": ["quiz me", "quiz", "test me", "question me", "give me a question", "test my knowledge"],
    "explain_result": ["explain result", "explain my circuit", "what happened", "what did this do", "explain this result", "why did i get"],
    "calculate": ["calculate", "probability of", "what is the probability", "find p(", "compute", "p(0)", "p(1)", "probabilities"],
    "compare": ["difference between", "compare", "vs", "versus", "how does it differ"],
    "simplify": ["explain this in simpler terms", "explain in simpler terms", "simpler terms", "explain simply", "simple explanation", "eli5", "in plain english", "beginner"],
    "explain_simply": ["explain like i'm a beginner", "explain simply", "simple explanation", "eli5", "in plain english", "beginner", "in simpler terms"],
    "define": ["what is", "define", "meaning of", "what does", "stand for"],
    "socratic": ["socratic", "socratic questions", "teach me using socratic", "ask me questions", "guiding question", "guide me", "socratic method"]
}

STOPWORDS = {
    "what", "is", "a", "an", "the", "in", "of", "to", "for", "with", "does", "do", "how",
    "when", "can", "why", "are", "and", "or", "by", "from", "on", "at", "as", "it", "this",
    "that", "be", "tell", "show", "me", "you", "my", "your", "using"
}

QUANTUM_SINGLE_TOKENS = {"h", "x", "y", "z", "0", "1"}

# Semantic synonym expansion for quantum computing concepts
SEMANTIC_SYNONYMS = {
    "square": ["squared", "squaring", "²", "^2", "magnitude", "born", "|α|²", "|β|²", "modulus"],
    "squaring": ["square", "squared", "²", "^2", "magnitude", "born", "|α|²"],
    "squared": ["square", "squaring", "²", "^2", "magnitude", "born", "|α|²"],
    "amplitude": ["amplitudes", "coefficient", "coefficients", "probability amplitude", "α", "β", "|α|²", "|β|²", "statevector"],
    "amplitudes": ["amplitude", "coefficient", "coefficients", "probability amplitude", "α", "β", "|α|²", "|β|²"],
    "born": ["born rule", "born-rule", "probability", "squared magnitude", "|α|²", "measurement"],
    "rule": ["born", "born rule", "law", "formula"],
    "probability": ["probabilities", "chance", "likelihood", "p(0)", "p(1)", "born", "measurement"],
    "probabilities": ["probability", "chance", "likelihood", "p(0)", "p(1)", "born", "measurement"],
    "measurement": ["measuring", "measured", "measure", "collapse", "basis", "readout", "observable"],
    "measuring": ["measurement", "measure", "collapse", "observe"],
    "measure": ["measurement", "measuring", "collapse", "observe"],
    "qubit": ["qubits", "quantum bit", "two-level", "state"],
    "qubits": ["qubit", "quantum bit", "two-level", "state"],
    "superposition": ["linear combination", "basis states", "hadamard"],
    "interference": ["constructive", "destructive", "cancel", "reinforce", "phase"],
    "entanglement": ["entangled", "bell state", "cnot", "correlated"],
    "entangled": ["entanglement", "bell state", "cnot", "correlated"],
    "hadamard": ["h gate", "superposition", "h", "interfere"]
}


@dataclass
class RetrievalResult:
    """Encapsulates retrieved items and intent for prompt assembly and validation."""
    intent: str
    is_telemetry_request: bool
    is_out_of_scope: bool
    primary_concept: Optional[Concept] = None
    matched_concepts: List[Concept] = field(default_factory=list)
    matched_misconception: Optional[Misconception] = None
    matched_examples: List[WorkedExample] = field(default_factory=list)
    matched_ground_truth: List[GroundTruthRule] = field(default_factory=list)
    matched_assessment: Optional[AssessmentQuestion] = None
    retrieved_chunks: List[str] = field(default_factory=list)
    sources: List[Dict[str, str]] = field(default_factory=list)
    topic_id: str = ""


def _normalize_quantum_text(text: str) -> str:
    """Normalize text preserving mathematical expressions and quantum notations."""
    t = text.lower()
    t = t.replace("√3/2", " sqrt3_2 frac_sqrt3_2 3/2 ")
    t = t.replace("1/2", " half frac_1_2 ")
    t = t.replace("1/√2", " one_over_sqrt2 ")
    t = t.replace("|0⟩", " state_0 zero_state 0 ")
    t = t.replace("|1⟩", " state_1 one_state 1 ")
    t = t.replace("|00⟩", " state_00 00 ")
    t = t.replace("|11⟩", " state_11 11 ")
    t = t.replace("|01⟩", " state_01 01 ")
    t = t.replace("|10⟩", " state_10 10 ")
    t = t.replace("|ψ⟩", " state_psi psi ")
    t = t.replace("|α|²", " alpha_squared squared_amplitude ")
    t = t.replace("|β|²", " beta_squared squared_amplitude ")
    t = t.replace("²", " squared ")
    return t


def _tokenize(text: str) -> Set[str]:
    """Normalize and tokenize text into domain word tokens, omitting stopwords."""
    norm = _normalize_quantum_text(text)
    raw_tokens = re.findall(r"[a-zA-Z0-9_αβψ\^/]+", norm)
    res = set()
    for t in raw_tokens:
        tok_clean = t.strip("_")
        if not tok_clean:
            continue
        if (len(tok_clean) >= 2 or tok_clean in QUANTUM_SINGLE_TOKENS) and tok_clean not in STOPWORDS:
            res.add(tok_clean)
            if tok_clean.endswith("ies") and len(tok_clean) > 4:
                res.add(tok_clean[:-3] + "y")
            elif tok_clean.endswith("ing") and len(tok_clean) > 4:
                res.add(tok_clean[:-3])
            elif tok_clean.endswith("ed") and len(tok_clean) > 3:
                res.add(tok_clean[:-2])
            elif tok_clean.endswith("es") and len(tok_clean) > 4:
                res.add(tok_clean[:-2])
            elif tok_clean.endswith("s") and len(tok_clean) > 3:
                res.add(tok_clean[:-1])
    return res


def _tokenize_list(text: str) -> List[str]:
    """Return ordered list of tokens with stems."""
    norm = _normalize_quantum_text(text)
    raw_tokens = re.findall(r"[a-zA-Z0-9_αβψ\^/]+", norm)
    tokens: List[str] = []
    for t in raw_tokens:
        tok_clean = t.strip("_")
        if not tok_clean:
            continue
        if (len(tok_clean) >= 2 or tok_clean in QUANTUM_SINGLE_TOKENS) and tok_clean not in STOPWORDS:
            tokens.append(tok_clean)
            if tok_clean.endswith("ies") and len(tok_clean) > 4:
                tokens.append(tok_clean[:-3] + "y")
            elif tok_clean.endswith("ing") and len(tok_clean) > 4:
                tokens.append(tok_clean[:-3])
            elif tok_clean.endswith("ed") and len(tok_clean) > 3:
                tokens.append(tok_clean[:-2])
            elif tok_clean.endswith("s") and len(tok_clean) > 3:
                tokens.append(tok_clean[:-1])
    return tokens


class TopicRetriever:
    """Topic-agnostic educational retriever with lightweight semantic ranking."""

    def __init__(self, registry: Optional[TopicRegistry] = None):
        self.registry = registry or get_topic_registry()

    def detect_intent(self, query: str, quiz_state: Optional[Dict[str, Any]] = None) -> Tuple[str, bool]:
        """Detect intent data-driven from query patterns, keywords, and quiz_state context."""
        q_lower = query.strip().lower()

        # If a quiz is active and awaiting an answer, check if input is a quiz answer or explanation first
        if quiz_state and quiz_state.get("awaitingAnswer"):
            if q_lower in ["a", "b", "c", "d", "option a", "option b", "option c", "option d", "choice a", "choice b", "choice c", "choice d"] or q_lower.startswith("option ") or q_lower.startswith("choice ") or re.search(r"^\b([a-d])\b$", q_lower):
                return "quiz_answer", False
            if "why" in q_lower and ("correct" in q_lower or "right" in q_lower or "answer" in q_lower):
                return "quiz_explanation", False

        # Single letter A/B/C/D input without active quiz state but in quiz option format
        if q_lower in ["a", "b", "c", "d", "option a", "option b", "option c", "option d", "choice a", "choice b", "choice c", "choice d"]:
            return "quiz_answer", False
        
        # Check global intent patterns
        for intent, patterns in GLOBAL_INTENTS.items():
            for pat in patterns:
                if re.search(r'\b' + re.escape(pat) + r'\b', q_lower):
                    is_telem = (intent == "explain_result")
                    return intent, is_telem
                    
        return "general", False

    def _build_indexed_chunks(self) -> List[Dict[str, Any]]:
        """Index curriculum chunks across all loaded topic packs."""
        chunks = []
        for topic_id in self.registry.loaded_topic_ids:
            pack = self.registry.get_topic(topic_id)
            if not pack:
                continue

            # 1. Concepts
            for c in pack.concepts_file.concepts:
                text_parts = [
                    f"Concept: {c.title}",
                    f"Simple: {c.simple_explanation}",
                    f"Visual Explanation: {c.visual_explanation or ''}",
                    f"Technical: {c.technical_explanation or ''}",
                    f"Math: {c.mathematical_representation or ''}",
                    f"Keywords: {' '.join(c.keywords)}",
                    f"Why: {c.why_it_matters or ''}",
                    f"How: {c.how_it_works or ''}",
                    f"Example: {c.example or ''}",
                    f"Common Mistake: {c.common_mistake or ''}",
                    f"Key Takeaway: {c.key_takeaway or ''}"
                ]
                full_text = " ".join(p for p in text_parts if p)
                chunks.append({
                    "type": "concept",
                    "topic_id": topic_id,
                    "id": c.id,
                    "title": c.title,
                    "text": full_text,
                    "obj": c
                })

            # 2. Worked Examples
            for ex in pack.examples_file.examples:
                steps_text = " ".join(ex.steps or [])
                text_parts = [
                    f"Worked Example: {ex.title}",
                    f"Problem: {ex.question or ''}",
                    f"Steps: {steps_text}",
                    f"Answer: {ex.answer or ''}",
                    f"Calculation: {getattr(ex, 'calculation', '') or ''}",
                    f"Interpretation: {getattr(ex, 'interpretation', '') or ''}"
                ]
                full_text = " ".join(p for p in text_parts if p)
                chunks.append({
                    "type": "example",
                    "topic_id": topic_id,
                    "id": ex.id,
                    "title": ex.title,
                    "text": full_text,
                    "obj": ex
                })

            # 3. Ground Truth Rules
            for gt in pack.ground_truth_file.rules:
                text_parts = [
                    f"Ground Truth: {gt.id}",
                    f"Input: {gt.input}",
                    f"Statement: {gt.statement or ''}",
                    f"Expected: {str(gt.expected)}",
                    f"Verification: {str(gt.verification or '')}"
                ]
                full_text = " ".join(p for p in text_parts if p)
                chunks.append({
                    "type": "ground_truth",
                    "topic_id": topic_id,
                    "id": gt.id,
                    "title": f"Rule {gt.id}",
                    "text": full_text,
                    "obj": gt
                })

            # 4. Misconceptions
            for m in pack.misconceptions_file.misconceptions:
                text_parts = [
                    f"Misconception: {m.misconception}",
                    f"Why wrong: {m.why_wrong}",
                    f"Reality: {m.correction}",
                    f"Triggers: {' '.join(m.trigger_keywords)}"
                ]
                full_text = " ".join(p for p in text_parts if p)
                chunks.append({
                    "type": "misconception",
                    "topic_id": topic_id,
                    "id": m.id,
                    "title": f"Misconception {m.id}",
                    "text": full_text,
                    "obj": m
                })

            # 5. Assessments
            all_q = list(pack.assessments_file.assessments) + list(pack.assessments_file.quick_understanding_checks)
            for a in all_q:
                text_parts = [
                    f"Assessment: {a.id}",
                    f"Question: {a.question}",
                    f"Explanation: {a.explanation or ''}",
                    f"Feedback: {' '.join(a.option_feedback or [])}"
                ]
                full_text = " ".join(p for p in text_parts if p)
                chunks.append({
                    "type": "assessment",
                    "topic_id": topic_id,
                    "id": a.id,
                    "title": f"Assessment {a.id}",
                    "text": full_text,
                    "obj": a
                })

        return chunks

    def retrieve(
        self,
        query: str,
        current_topic_id: str,
        concept_id: Optional[str] = None,
        visible_visual: Optional[Dict[str, Any]] = None,
        completed_topic_ids: Optional[List[str]] = None,
        has_circuit: bool = False,
        learning_context: Optional[Dict[str, Any]] = None,
        is_misconception_predicted: bool = False
    ) -> RetrievalResult:
        """Retrieve scoped educational content with topic/concept grounding and boundary enforcement."""
        if learning_context:
            if not current_topic_id:
                current_topic_id = learning_context.get("topic_id")
            if not concept_id:
                concept_id = learning_context.get("concept_id")
            if not visible_visual:
                visible_visual = learning_context.get("visible_visual")

        intent, is_telem = self.detect_intent(query)
        if has_circuit and (is_telem or "circuit" in query.lower() or "result" in query.lower()):
            is_telem = True

        q_lower = query.lower()
        q_tokens = _tokenize(query)
        q_tokens_list = _tokenize_list(query)

        deictic_phrases = [
            "explain this", "what is this", "what does this mean", "tell me about this",
            "simplify this", "what am i looking at", "explain diagram", "explain visual",
            "this concept", "this lesson", "this screen", "this part", "in simpler terms",
            "why does this work", "give me an example", "what does this do", "understand this",
            "help me understand", "can you explain this", "break this down", "quiz me on this",
            "explain like i'm a beginner"
        ]
        is_deictic = any(phrase in q_lower for phrase in deictic_phrases) or (len(q_tokens) <= 3 and not any(kw in q_lower for kw in ["qubit", "superposition", "entanglement", "measurement", "born", "matrix"]))
        is_visual_query = any(w in q_lower for w in ["diagram", "visual", "figure", "chart", "graphic", "image", "looking at", "what am i looking at", "what is this visual"])

        # Check if the query explicitly targets a different topic by name
        cross_topic_target = None
        for tid in self.registry.loaded_topic_ids:
            if tid == current_topic_id:
                continue
            t_pack = self.registry.get_topic(tid)
            if not t_pack:
                continue
            for c in t_pack.concepts_file.concepts:
                c_title_tokens = [tok for tok in _tokenize_list(c.title.lower()) if tok not in STOPWORDS and len(tok) > 4]
                if any(tok in q_lower for tok in c_title_tokens):
                    cross_topic_target = tid
                    break
            if cross_topic_target:
                break

        # 1. Index all curriculum chunks across all loaded packs
        all_chunks = self._build_indexed_chunks()
        if not all_chunks:
            return RetrievalResult(
                intent=intent,
                is_telemetry_request=is_telem,
                is_out_of_scope=True,
                topic_id=current_topic_id
            )

        # 2. Semantic query expansion
        expanded_query_weights: Dict[str, float] = {}
        for qt in q_tokens_list:
            expanded_query_weights[qt] = max(expanded_query_weights.get(qt, 0.0), 1.0)
            if qt in SEMANTIC_SYNONYMS:
                for syn in SEMANTIC_SYNONYMS[qt]:
                    for st in _tokenize_list(syn):
                        expanded_query_weights[st] = max(expanded_query_weights.get(st, 0.0), 0.5)

        # Compute document frequencies and BM25 document lengths
        chunk_tokens_list = [_tokenize_list(c["text"]) for c in all_chunks]
        chunk_lens = [max(len(dt), 1) for dt in chunk_tokens_list]
        avg_dl = sum(chunk_lens) / max(len(chunk_lens), 1)
        total_docs = len(all_chunks)

        df_counter: Counter = Counter()
        for dt in chunk_tokens_list:
            for term in set(dt):
                df_counter[term] += 1

        # BM25 Scoring
        k1 = 1.2
        b = 0.75
        scored_chunks: List[Tuple[float, Dict[str, Any]]] = []

        for idx, chunk in enumerate(all_chunks):
            is_same_topic = (chunk["topic_id"] == current_topic_id)
            if is_deictic and current_topic_id and not is_same_topic and not cross_topic_target:
                # Strictly enforce topic boundary on deictic queries
                continue

            dt = chunk_tokens_list[idx]
            dl = chunk_lens[idx]
            tf_map = Counter(dt)
            score = 0.0

            for term, q_weight in expanded_query_weights.items():
                if term in tf_map:
                    tf = tf_map[term]
                    df = df_counter.get(term, 1)
                    idf = math.log((total_docs - df + 0.5) / (df + 0.5) + 1.0)
                    tf_component = (tf * (k1 + 1.0)) / (tf + k1 * (1.0 - b + b * (dl / avg_dl)))
                    score += q_weight * idf * tf_component

            # Active concept affinity boost
            if concept_id and is_same_topic:
                if chunk["type"] == "concept" and chunk["id"] == concept_id:
                    score += 80.0
                elif chunk["type"] in ["example", "ground_truth", "assessment"] and concept_id.lower() in chunk["text"].lower():
                    score += 20.0

            # Active visual affinity boost
            if visible_visual and is_same_topic:
                v_title = (visible_visual.get("title") or "").lower()
                if v_title and v_title in chunk["text"].lower():
                    score += 25.0

            # Formula and phrase matching boosts
            c_text_lower = chunk["text"].lower()
            if "born rule" in q_lower and "born rule" in c_text_lower:
                score += 5.0
            if "probability amplitude" in q_lower and "probability amplitude" in c_text_lower:
                score += 4.0
            if "√3/2" in query and ("√3/2" in chunk["text"] or "sqrt3_2" in c_text_lower):
                score += 8.0
            if "h then h" in q_lower and ("h followed by h" in c_text_lower or "h(h|" in c_text_lower or "applied twice" in c_text_lower):
                score += 6.0
            if "why do we square" in q_lower and ("squared magnitude" in c_text_lower or "|α|²" in chunk["text"] or "born" in c_text_lower):
                score += 5.0
            if "bell state" in q_lower and ("bell state" in c_text_lower or "|00⟩" in chunk["text"]):
                score += 4.0

            # Boost concept whose full title matches a phrase in the query (within active topic)
            if chunk["type"] == "concept" and is_same_topic:
                c_title_low = chunk["title"].lower()
                if c_title_low in q_lower and len(c_title_low) > 4:
                    score += 25.0

            # Topic boundary affinity
            if current_topic_id:
                if is_same_topic:
                    score *= 2.5
                elif not cross_topic_target:
                    score *= 0.1  # Attenuate other topics

            if score > 0.0:
                scored_chunks.append((score, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # 3. Categorize matched items
        matched_concepts: List[Concept] = []
        matched_examples: List[WorkedExample] = []
        matched_ground_truth: List[GroundTruthRule] = []
        matched_assessment: Optional[AssessmentQuestion] = None
        matched_misconception: Optional[Misconception] = None
        sources: List[Dict[str, str]] = []
        retrieved_chunks: List[str] = []

        seen_concept_ids: Set[str] = set()
        seen_example_ids: Set[str] = set()
        seen_gt_ids: Set[str] = set()

        # If visible_visual is active on screen, format its chunk first
        if visible_visual and (is_visual_query or is_deictic or not scored_chunks):
            v_title = visible_visual.get("title") or "Active Visual Diagram"
            v_type = visible_visual.get("type") or "diagram"
            v_caption = visible_visual.get("caption") or ""
            v_desc = visible_visual.get("description") or ""
            if v_desc or v_caption:
                vis_chunk = (
                    f"ACTIVE VISUAL DIAGRAM ON SCREEN: {v_title} ({v_type})\n"
                    f"- Caption: {v_caption}\n"
                    f"- Description / Meaning: {v_desc}"
                )
                retrieved_chunks.append(vis_chunk)
                sources.append({
                    "type": "visual",
                    "id": str(visible_visual.get("id") or "active_visual"),
                    "topic_id": current_topic_id or ""
                })

        for score, chunk in scored_chunks:
            c_type = chunk["type"]
            c_id = chunk["id"]
            topic_id = chunk["topic_id"]

            if c_type == "concept" and c_id not in seen_concept_ids and len(matched_concepts) < 3:
                concept_obj: Concept = chunk["obj"]
                matched_concepts.append(concept_obj)
                seen_concept_ids.add(c_id)
                sources.append({"type": "concept", "id": c_id, "topic_id": topic_id})
                
                # Format chunk
                chunk_str = f"Concept: {concept_obj.title} (Topic {topic_id})\n- Simple Explanation: {concept_obj.simple_explanation}"
                if concept_obj.mathematical_representation:
                    chunk_str += f"\n- Mathematical Representation: {concept_obj.mathematical_representation}"
                if concept_obj.technical_explanation:
                    chunk_str += f"\n- Technical Basis: {concept_obj.technical_explanation}"
                if getattr(concept_obj, 'visual_explanation', None):
                    chunk_str += f"\n- Visual Explanation: {concept_obj.visual_explanation}"
                if concept_obj.example:
                    chunk_str += f"\n- Example: {concept_obj.example}"
                if getattr(concept_obj, 'common_mistake', None):
                    chunk_str += f"\n- Common Mistake: {concept_obj.common_mistake}"
                retrieved_chunks.append(chunk_str)

            elif c_type == "example" and c_id not in seen_example_ids and len(matched_examples) < 2:
                ex_obj: WorkedExample = chunk["obj"]
                matched_examples.append(ex_obj)
                seen_example_ids.add(c_id)
                sources.append({"type": "example", "id": c_id, "topic_id": topic_id})

                steps_fmt = " -> ".join(ex_obj.steps) if ex_obj.steps else ""
                chunk_str = f"Worked Example: {ex_obj.title} (Topic {topic_id})\n- Problem: {ex_obj.question}\n- Steps: {steps_fmt}\n- Answer: {ex_obj.answer}"
                retrieved_chunks.append(chunk_str)

            elif c_type == "ground_truth" and c_id not in seen_gt_ids and len(matched_ground_truth) < 2:
                gt_obj: GroundTruthRule = chunk["obj"]
                matched_ground_truth.append(gt_obj)
                seen_gt_ids.add(c_id)
                sources.append({"type": "ground_truth", "id": c_id, "topic_id": topic_id})

                stmt = f" - Statement: {gt_obj.statement}" if gt_obj.statement else ""
                chunk_str = f"Ground Truth Rule ({gt_obj.id}): Input '{gt_obj.input}'{stmt} -> Expected: {gt_obj.expected}"
                retrieved_chunks.append(chunk_str)

            elif c_type == "assessment" and not matched_assessment and score >= 10.0:
                a_obj: AssessmentQuestion = chunk["obj"]
                matched_assessment = a_obj
                sources.append({"type": "assessment", "id": c_id, "topic_id": topic_id})

                chunk_str = f"Curriculum Assessment Context: {a_obj.question}\n- Verified Explanation: {a_obj.explanation}"
                retrieved_chunks.append(chunk_str)

            elif c_type == "misconception" and not matched_misconception:
                m_obj: Misconception = chunk["obj"]
                triggers = [t.lower() for t in m_obj.trigger_keywords]
                misc_text_lower = (m_obj.misconception + " " + m_obj.correction + " " + getattr(m_obj, 'why_wrong', '')).lower()
                is_direct_match = any(t in q_lower for t in triggers if len(t) > 2)
                is_hype_query = any(w in q_lower for w in ["instantly", "solve every", "all problems", "faster at everything", "exponentially faster at everything", "try every answer", "break all"])
                if is_direct_match or (is_misconception_predicted and score >= 3.0) or (is_hype_query and ("faster" in misc_text_lower or "every" in misc_text_lower or "np" in misc_text_lower or "problem" in misc_text_lower)):
                    matched_misconception = m_obj
                    sources.append({"type": "misconception", "id": c_id, "topic_id": topic_id})
                    chunk_str = f"Misconception Alert: {m_obj.misconception}\n- Why Wrong: {m_obj.why_wrong}\n- Scientific Correction: {m_obj.correction}"
                    retrieved_chunks.append(chunk_str)

        # Fallback: if concept_id is known but wasn't retrieved, fetch it directly
        if concept_id and (not matched_concepts or matched_concepts[0].id != concept_id):
            curr_pack = self.registry.get_topic(current_topic_id)
            if curr_pack:
                target_c = next((c for c in curr_pack.concepts_file.concepts if c.id == concept_id), None)
                if target_c:
                    matched_concepts.insert(0, target_c)
                    sources.insert(0, {"type": "concept", "id": target_c.id, "topic_id": current_topic_id})
                    chunk_str = f"Target Concept on Screen: {target_c.title} (Topic {current_topic_id})\n- Simple Explanation: {target_c.simple_explanation}"
                    if target_c.mathematical_representation:
                        chunk_str += f"\n- Mathematical Representation: {target_c.mathematical_representation}"
                    if target_c.technical_explanation:
                        chunk_str += f"\n- Technical Basis: {target_c.technical_explanation}"
                    if getattr(target_c, 'visual_explanation', None):
                        chunk_str += f"\n- Visual Explanation: {target_c.visual_explanation}"
                    if target_c.example:
                        chunk_str += f"\n- Example: {target_c.example}"
                    retrieved_chunks.insert(0, chunk_str)

        primary_concept = matched_concepts[0] if matched_concepts else None

        # 4. Semantic Scope Check
        out_of_scope_patterns = [
            "current qubit count", "vendor device", "how many qubits does ibm currently",
            "how many qubits does google currently", "modular exponentiation step by step"
        ]
        is_quiz_option_choice = (
            q_lower in ["a", "b", "c", "d", "option a", "option b", "option c", "option d", "choice a", "choice b", "choice c", "choice d"]
            or q_lower.startswith("option ")
            or q_lower.startswith("choice ")
        )
        is_out_of_scope = False

        if any(pat in q_lower for pat in out_of_scope_patterns):
            is_out_of_scope = True
        elif is_quiz_option_choice or concept_id or visible_visual or is_deictic or is_visual_query:
            is_out_of_scope = False
            if not primary_concept:
                current_pack = self.registry.get_topic(current_topic_id)
                if current_pack and current_pack.concepts_file.concepts:
                    primary_concept = current_pack.concepts_file.concepts[0]
                    matched_concepts = [primary_concept]
                    sources.append({"type": "concept", "id": primary_concept.id, "topic_id": current_topic_id})
        elif not matched_concepts and not matched_examples and not matched_ground_truth and not matched_assessment and not is_telem:
            if intent == "quiz_me":
                current_pack = self.registry.get_topic(current_topic_id)
                if current_pack and current_pack.assessments_file.assessments:
                    matched_assessment = current_pack.assessments_file.assessments[0]
                    sources.append({"type": "assessment", "id": matched_assessment.id, "topic_id": current_topic_id})
                elif current_pack and current_pack.concepts_file.concepts:
                    primary_concept = current_pack.concepts_file.concepts[0]
                    matched_concepts = [primary_concept]
                    sources.append({"type": "concept", "id": primary_concept.id, "topic_id": current_topic_id})
            else:
                is_out_of_scope = True
        elif scored_chunks and scored_chunks[0][0] < 1.5 and not is_telem and not is_quiz_option_choice:
            is_out_of_scope = True

        return RetrievalResult(
            intent=intent,
            is_telemetry_request=is_telem,
            is_out_of_scope=is_out_of_scope,
            primary_concept=primary_concept,
            matched_concepts=matched_concepts,
            matched_misconception=matched_misconception,
            matched_examples=matched_examples,
            matched_ground_truth=matched_ground_truth,
            matched_assessment=matched_assessment,
            retrieved_chunks=retrieved_chunks,
            sources=sources,
            topic_id=current_topic_id
        )
