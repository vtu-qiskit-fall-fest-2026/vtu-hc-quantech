"""Knowledge base loader for curated quantum curriculum, misconceptions, and book references."""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from backend.models.learning import (
    Concept, Lesson, Misconception, Resource, CitationItem,
    WorkedExample, GroundTruthRule, TopicInfo
)

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "content-pipeline" / "data"
OUTPUT_DIR = PROJECT_ROOT / "content-pipeline" / "output"
TOPIC_DIR = PROJECT_ROOT / "topic_1_1"


class KnowledgeBase:
    """Singleton knowledge base providing verified quantum education content and Topic 1.1 integration."""

    _instance: Optional["KnowledgeBase"] = None

    def __init__(self):
        self.concepts: Dict[str, Concept] = {}
        self.lessons: Dict[str, Lesson] = {}
        self.misconceptions: Dict[str, List[Misconception]] = {}
        self.all_misconceptions: List[Misconception] = []
        self.resources: Dict[str, Resource] = {}
        self.verification_report: Dict[str, Any] = {}
        self.topics: Dict[str, TopicInfo] = {}
        self.examples: Dict[str, List[WorkedExample]] = {}
        self.all_examples: List[WorkedExample] = []
        self.ground_truth_rules: List[GroundTruthRule] = []
        self._load()

    @classmethod
    def get_instance(cls) -> "KnowledgeBase":
        if cls._instance is None:
            cls._instance = KnowledgeBase()
        return cls._instance

    def _load(self):
        # 1. Load concepts
        concepts_file = DATA_DIR / "concepts.json"
        if concepts_file.exists():
            try:
                with open(concepts_file, "r", encoding="utf-8") as f:
                    raw_concepts = json.load(f)
                    for item in raw_concepts:
                        concept = Concept(**item)
                        self.concepts[concept.id] = concept
                logger.info("Loaded %d concepts from %s", len(self.concepts), concepts_file)
            except Exception as e:
                logger.error("Failed loading concepts.json: %s", e)

        # 2. Load lessons
        lessons_file = OUTPUT_DIR / "lessons.json"
        if lessons_file.exists():
            try:
                with open(lessons_file, "r", encoding="utf-8") as f:
                    raw_lessons = json.load(f)
                    for item in raw_lessons:
                        lesson = Lesson(**item)
                        self.lessons[lesson.concept_id] = lesson
                logger.info("Loaded %d lessons from %s", len(self.lessons), lessons_file)
            except Exception as e:
                logger.error("Failed loading lessons.json: %s", e)

        # 3. Load misconceptions
        misconceptions_file = DATA_DIR / "misconceptions.json"
        if misconceptions_file.exists():
            try:
                with open(misconceptions_file, "r", encoding="utf-8") as f:
                    raw_misc = json.load(f)
                    for item in raw_misc:
                        misc = Misconception(**item)
                        if misc.concept_id not in self.misconceptions:
                            self.misconceptions[misc.concept_id] = []
                        self.misconceptions[misc.concept_id].append(misc)
                logger.info("Loaded misconceptions for %d concepts", len(self.misconceptions))
            except Exception as e:
                logger.error("Failed loading misconceptions.json: %s", e)

        # 4. Load resources (stored as dictionary keyed by concept_id)
        resources_file = DATA_DIR / "resources.json"
        if resources_file.exists():
            try:
                with open(resources_file, "r", encoding="utf-8") as f:
                    raw_res = json.load(f)
                    for cid, data in raw_res.items():
                        citations = [CitationItem(**c) for c in data.get("citations", [])]
                        self.resources[cid] = Resource(concept_id=cid, citations=citations)
                logger.info("Loaded resources for %d concepts", len(self.resources))
            except Exception as e:
                logger.error("Failed loading resources.json: %s", e)

        # 5. Load verification report
        ver_file = OUTPUT_DIR / "verification_report.json"
        if ver_file.exists():
            try:
                with open(ver_file, "r", encoding="utf-8") as f:
                    self.verification_report = json.load(f)
                logger.info("Loaded verification report: %d/%d passed",
                            self.verification_report.get("passed", 0),
                            self.verification_report.get("totalLessons", 0))
            except Exception as e:
                logger.error("Failed loading verification_report.json: %s", e)

        # 6. Load Topic 1.1 Knowledge
        topic_knowledge_file = TOPIC_DIR / "knowledge.json"
        if not topic_knowledge_file.exists():
            topic_knowledge_file = DATA_DIR / "topic_1_1" / "knowledge.json"
        if topic_knowledge_file.exists():
            try:
                with open(topic_knowledge_file, "r", encoding="utf-8") as f:
                    t_data = json.load(f)
                    tid = str(t_data.get("topic_id", "1.1"))
                    concepts_list = []
                    for c_raw in t_data.get("concepts", []):
                        concept = Concept(
                            id=c_raw["id"],
                            title=c_raw["title"],
                            tier=t_data.get("level", 1),
                            tier_name="Foundations",
                            difficulty=t_data.get("difficulty", "beginner"),
                            prerequisites=t_data.get("prerequisites", []),
                            bloom_level="Understand",
                            linked_lesson_id=tid,
                            summary=c_raw.get("explanation", c_raw.get("definition", "")),
                            definition=c_raw.get("definition"),
                            explanation=c_raw.get("explanation"),
                            mathematics=c_raw.get("mathematics"),
                            topic_id=tid
                        )
                        self.concepts[concept.id] = concept
                        self.concepts[f"{tid}:{concept.id}"] = concept
                        concepts_list.append(concept)

                    topic_info = TopicInfo(
                        topic_id=tid,
                        topic_name=t_data.get("topic_name", "What Is Quantum Computing?"),
                        level=t_data.get("level", 1),
                        module=t_data.get("module", "Introduction to Quantum Computing"),
                        purpose=t_data.get("purpose", ""),
                        prerequisites=t_data.get("prerequisites", []),
                        math_required=t_data.get("math_required", ""),
                        estimated_time=t_data.get("estimated_time", ""),
                        difficulty=t_data.get("difficulty", "beginner"),
                        next_topic=t_data.get("next_topic", ""),
                        tags=t_data.get("tags", []),
                        learning_objectives=t_data.get("learning_objectives", []),
                        concepts=concepts_list
                    )
                    self.topics[tid] = topic_info
                    self.topics["topic_1_1"] = topic_info

                    root_concept = Concept(
                        id="topic_1_1",
                        title=topic_info.topic_name,
                        tier=topic_info.level,
                        tier_name="Foundations",
                        difficulty=topic_info.difficulty,
                        bloom_level="Understand",
                        linked_lesson_id=tid,
                        summary=topic_info.purpose,
                        topic_id=tid
                    )
                    self.concepts["1.1"] = root_concept
                    self.concepts["topic_1_1"] = root_concept
                    logger.info("Loaded Topic %s (%s) with %d concepts", tid, topic_info.topic_name, len(concepts_list))
            except Exception as e:
                logger.error("Failed loading Topic 1.1 knowledge.json: %s", e)

        # 7. Load Topic 1.1 Misconceptions
        topic_misc_file = TOPIC_DIR / "misconceptions.json"
        if not topic_misc_file.exists():
            topic_misc_file = DATA_DIR / "topic_1_1" / "misconceptions.json"
        if topic_misc_file.exists():
            try:
                with open(topic_misc_file, "r", encoding="utf-8") as f:
                    m_data = json.load(f)
                    tid = str(m_data.get("topic_id", "1.1"))
                    misc_items = []
                    for item in m_data.get("misconceptions", []):
                        misc = Misconception(
                            id=item["id"],
                            title=item.get("title") or item["id"],
                            concept_id=tid,
                            topic_id=tid,
                            false_belief=item.get("misconception") or item.get("false_belief", ""),
                            refutation=item.get("correction") or item.get("refutation", ""),
                            distractor_hint=item.get("distractor_hint")
                        )
                        misc_items.append(misc)
                        self.all_misconceptions.append(misc)

                    self.misconceptions[tid] = misc_items
                    self.misconceptions["topic_1_1"] = misc_items
                    logger.info("Loaded %d Topic %s misconceptions", len(misc_items), tid)
            except Exception as e:
                logger.error("Failed loading Topic 1.1 misconceptions.json: %s", e)

        # 8. Load Topic 1.1 Worked Examples
        topic_examples_file = TOPIC_DIR / "examples.json"
        if not topic_examples_file.exists():
            topic_examples_file = DATA_DIR / "topic_1_1" / "examples.json"
        if topic_examples_file.exists():
            try:
                with open(topic_examples_file, "r", encoding="utf-8") as f:
                    e_data = json.load(f)
                    tid = str(e_data.get("topic_id", "1.1"))
                    ex_items = []
                    for item in e_data.get("examples", []):
                        ex = WorkedExample(
                            id=item["id"],
                            title=item["title"],
                            question=item["question"],
                            steps=item.get("steps", []),
                            answer=item["answer"],
                            topic_id=tid
                        )
                        ex_items.append(ex)
                        self.all_examples.append(ex)

                    self.examples[tid] = ex_items
                    self.examples["topic_1_1"] = ex_items
                    logger.info("Loaded %d Topic %s worked examples", len(ex_items), tid)
            except Exception as e:
                logger.error("Failed loading Topic 1.1 examples.json: %s", e)

        # 9. Load Topic 1.1 Ground Truth Rules
        topic_gt_file = TOPIC_DIR / "ground_truth.json"
        if not topic_gt_file.exists():
            topic_gt_file = DATA_DIR / "topic_1_1" / "ground_truth.json"
        if topic_gt_file.exists():
            try:
                with open(topic_gt_file, "r", encoding="utf-8") as f:
                    gt_data = json.load(f)
                    tid = str(gt_data.get("topic_id", "1.1"))
                    for rule_raw in gt_data.get("rules", []):
                        rule = GroundTruthRule(
                            id=rule_raw["id"],
                            topic_id=tid,
                            input=rule_raw["input"],
                            expected=rule_raw["expected"],
                            type=rule_raw["type"]
                        )
                        self.ground_truth_rules.append(rule)
                    logger.info("Loaded %d Topic %s ground truth rules", len(self.ground_truth_rules), tid)
            except Exception as e:
                logger.error("Failed loading Topic 1.1 ground_truth.json: %s", e)

        # 10. Synthesize Topic 1.1 Lesson
        topic_info = self.topics.get("1.1")
        if topic_info:
            first_ex = self.examples["1.1"][0] if self.examples.get("1.1") else None
            topic_lesson = Lesson(
                id="lesson_topic_1_1",
                concept_id="1.1",
                title=topic_info.topic_name,
                tier=topic_info.level,
                tier_name="Foundations",
                difficulty=topic_info.difficulty,
                prerequisites=topic_info.prerequisites,
                bloom_level="Understand",
                linked_lesson_id="1.1",
                summary=topic_info.purpose,
                objectives=topic_info.learning_objectives,
                intuition=(
                    "Quantum computing harnesses fundamental principles of quantum mechanics—superposition, "
                    "interference, and entanglement—to process information in fundamentally different ways than classical computers."
                ),
                math="|ψ⟩ = α|0⟩ + β|1⟩, where α, β ∈ ℂ and |α|² + |β|² = 1.",
                try_it_challenge={
                    "prompt": "Construct a Hadamard gate on wire q[0] and measure to create an equal 50/50 superposition.",
                    "qubits": 1,
                    "allowed_gates": ["H", "M"]
                },
                worked_example={
                    "title": first_ex.title if first_ex else "Measurement probabilities",
                    "question": first_ex.question if first_ex else "",
                    "answer": first_ex.answer if first_ex else ""
                },
                quiz=[
                    {
                        "question": "Does a qubit literally store both 0 and 1 simultaneously as two separate classical values?",
                        "options": [
                            "Yes, it holds two classical bit strings at once.",
                            "No, it is in a quantum state with amplitudes; measurement collapses it to a single 0 or 1.",
                            "Yes, but only when cooled to absolute zero.",
                            "No, it is strictly identical to an ordinary classical probability distribution."
                        ],
                        "answer_index": 1,
                        "explanation": "A qubit is described by complex probability amplitudes. Upon measurement, it yields a single 0 or 1 outcome."
                    }
                ],
                common_mistakes=[m.false_belief for m in self.misconceptions.get("1.1", [])]
            )
            self.lessons["1.1"] = topic_lesson
            self.lessons["topic_1_1"] = topic_lesson

    def get_all_concepts(self) -> List[Concept]:
        return list(self.concepts.values())

    def get_concept(self, concept_id: str) -> Optional[Concept]:
        if not concept_id:
            return None
        return self.concepts.get(concept_id) or self.concepts.get(f"1.1:{concept_id}")

    def get_lesson(self, concept_id: str) -> Optional[Lesson]:
        if not concept_id:
            return None
        return self.lessons.get(concept_id)

    def get_all_lessons(self) -> List[Lesson]:
        return list(self.lessons.values())

    def get_misconceptions(self, concept_id: Optional[str] = None) -> List[Misconception]:
        if not concept_id:
            return self.all_misconceptions
        if concept_id in self.misconceptions:
            return self.misconceptions[concept_id]
        matched = [m for m in self.all_misconceptions if m.concept_id == concept_id or m.topic_id == concept_id]
        if matched:
            return matched
        return self.misconceptions.get(concept_id, [])

    def get_all_misconceptions(self) -> List[Misconception]:
        return self.all_misconceptions

    def get_resource(self, concept_id: str) -> Optional[Resource]:
        return self.resources.get(concept_id)

    def get_verification_report(self) -> Dict[str, Any]:
        return self.verification_report

    def get_topic(self, topic_id: str = "1.1") -> Optional[TopicInfo]:
        return self.topics.get(topic_id)

    def get_all_topics(self) -> List[TopicInfo]:
        seen = set()
        topics = []
        for t in self.topics.values():
            if t.topic_id not in seen:
                seen.add(t.topic_id)
                topics.append(t)
        return topics

    def get_examples(self, topic_id: str = "1.1") -> List[WorkedExample]:
        return self.examples.get(topic_id, self.all_examples)

    def get_all_examples(self) -> List[WorkedExample]:
        return self.all_examples

    def get_ground_truth(self, topic_id: str = "1.1") -> List[GroundTruthRule]:
        if not topic_id:
            return self.ground_truth_rules
        return [r for r in self.ground_truth_rules if r.topic_id == topic_id]
