"""Pydantic schemas for topic content packs.

Every pack file has a strict schema. The loader rejects packs with missing
required fields, invalid structures, or bad probabilities.
"""
import re
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


class TopicManifest(BaseModel):
    """Schema for manifest.json."""
    model_config = ConfigDict(extra="allow")

    id: str = Field(..., description="Unique topic ID, e.g. module or topic identifier")
    title: str = Field(..., description="Human-readable title")
    order: Union[int, float] = Field(..., description="Numerical sorting order")
    prerequisites: List[str] = Field(default_factory=list, description="List of prerequisite topic IDs")
    summary: str = Field(..., description="Short summary of the topic")
    estimated_minutes: Union[int, str] = Field(default=30, description="Estimated time to complete")
    status: str = Field(default="ready", description="'ready' or 'coming_soon'")
    gates_used: List[str] = Field(default_factory=list, description="Gates introduced or used in this topic")
    suggested_questions: List[str] = Field(
        default_factory=lambda: [
            "Explain this like I'm a beginner",
            "Quiz me",
            "What is the most common mistake here?"
        ],
        description="Suggested tutor questions for this topic"
    )
    completion_threshold: float = Field(default=0.75, description="Required quiz accuracy for completion")


class Concept(BaseModel):
    """Individual concept model."""
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    simple_explanation: str = ""
    visual_explanation: str = ""
    technical_explanation: str = ""
    example: str = ""
    keywords: List[str] = Field(default_factory=list)
    related_concepts: List[str] = Field(default_factory=list)
    circuit_example: Optional[Union[Dict[str, Any], List[Any], str]] = None
    why_it_matters: str = ""
    how_it_works: str = ""
    mathematical_representation: str = ""
    common_mistake: str = ""
    connection_to_previous_concepts: str = ""
    connection: str = ""
    try_it: str = ""
    key_takeaway: str = ""

    @model_validator(mode="before")
    @classmethod
    def normalize_concept(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("title") or not str(data.get("title")).strip():
                raise ValueError("Concept title cannot be empty")
            if not data.get("id") or not str(data.get("id")).strip():
                raise ValueError("Concept id cannot be empty")
            kw = data.get("keywords")
            if isinstance(kw, str):
                data["keywords"] = [k.strip() for k in kw.split(",") if k.strip()]
            elif kw is None:
                data["keywords"] = []
        return data


class ConceptsFile(BaseModel):
    """Schema for concepts.json."""
    topic_id: str
    concepts: List[Concept]


class Misconception(BaseModel):
    """Individual misconception model."""
    model_config = ConfigDict(extra="allow")

    id: str
    misconception: str
    why_wrong: str
    correction: str
    trigger_keywords: List[str] = Field(default_factory=list)
    forbidden_phrases: List[str] = Field(default_factory=list)
    wrong_claim: Optional[str] = None
    why_it_is_wrong: Optional[str] = None
    why_it_seems_reasonable: Optional[str] = None
    correct_statement: Optional[str] = None
    trigger_words: Optional[Union[str, List[str]]] = None
    example: Optional[str] = None
    raw_source: Optional[Any] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_misconception(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "id" not in data or not data["id"]:
                data["id"] = data.get("misconception_id") or "M_UNKNOWN"
            if "misconception" not in data or not data["misconception"]:
                data["misconception"] = data.get("wrong_claim") or data.get("false_belief") or ""
            if "why_wrong" not in data or not data["why_wrong"]:
                data["why_wrong"] = data.get("why_it_is_wrong") or data.get("why_it_seems_reasonable") or ""
            if "correction" not in data or not data["correction"]:
                data["correction"] = data.get("correct_statement") or data.get("refutation") or ""
            tk = data.get("trigger_keywords")
            tw = data.get("trigger_words")
            if isinstance(tk, str):
                data["trigger_keywords"] = [k.strip() for k in tk.split(",") if k.strip()]
            elif isinstance(tw, str) and not tk:
                data["trigger_keywords"] = [k.strip() for k in tw.split(",") if k.strip()]
            elif isinstance(tw, list) and not tk:
                data["trigger_keywords"] = tw
            elif tk is None:
                data["trigger_keywords"] = []

            fp = data.get("forbidden_phrases")
            if fp is None:
                fp = []
                if data.get("wrong_claim"):
                    clean = data["wrong_claim"].strip('"\' ')
                    if clean:
                        fp.append(clean)
                data["forbidden_phrases"] = fp
        return data


class MisconceptionsFile(BaseModel):
    """Schema for misconceptions.json."""
    topic_id: str
    misconceptions: List[Misconception]


class WorkedExample(BaseModel):
    """Individual worked example."""
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    question: str
    steps: List[str] = Field(default_factory=list)
    answer: str
    circuit: Optional[Union[Dict[str, Any], List[Any], str]] = None
    expected_probabilities: Optional[Dict[str, float]] = None
    goal: Optional[str] = ""
    given: Optional[Any] = ""
    calculation: Optional[str] = ""
    result: Optional[str] = ""
    interpretation: Optional[str] = ""
    common_mistake: Optional[str] = ""
    try_yourself: Optional[str] = ""
    num_qubits: Optional[int] = None
    raw_source: Optional[Any] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_example(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "question" not in data or not data["question"]:
                data["question"] = data.get("goal") or data.get("title") or ""
            if "answer" not in data or not data["answer"]:
                data["answer"] = data.get("result") or data.get("calculation") or ""
            if "steps" not in data:
                data["steps"] = []
            elif isinstance(data["steps"], str):
                data["steps"] = [data["steps"]]
        return data

    @field_validator("expected_probabilities")
    @classmethod
    def validate_probabilities(cls, v):
        if v is not None:
            total = sum(v.values())
            if abs(total - 1.0) > 1e-4:
                raise ValueError(f"Probabilities must sum to 1.0, got {total}")
        return v


class ExamplesFile(BaseModel):
    """Schema for examples.json."""
    topic_id: str
    examples: List[WorkedExample]


class GroundTruthRule(BaseModel):
    """Individual ground truth fact or rule."""
    model_config = ConfigDict(extra="allow")

    id: str
    input: str
    expected: Any = ""
    type: str = "fact"
    statement: Optional[str] = None
    time_sensitive: bool = False
    verification: Optional[Any] = None
    source: Optional[Any] = None
    related_concept: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_rule(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "id" not in data or not data["id"]:
                data["id"] = data.get("fact_id") or "GT_UNKNOWN"
            if "input" not in data or not data["input"]:
                data["input"] = data.get("statement") or ""
            if "expected" not in data or data["expected"] is None:
                data["expected"] = data.get("statement") or ""
            if "statement" not in data:
                data["statement"] = data["input"]
        return data


class GroundTruthFile(BaseModel):
    """Schema for ground_truth.json."""
    topic_id: str
    rules: List[GroundTruthRule]

    @model_validator(mode="before")
    @classmethod
    def normalize_gt_file(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "rules" not in data:
                data["rules"] = data.get("ground_truth") or data.get("facts") or []
        return data


class AssessmentQuestion(BaseModel):
    """Individual assessment / quick check question."""
    model_config = ConfigDict(extra="allow")

    id: str
    question: str
    options: List[str] = Field(default_factory=list)
    correct_option_index: int = 0
    explanation: str = ""
    option_feedback: Optional[List[str]] = None
    type: Optional[str] = None
    difficulty: Optional[str] = None
    correct_answer: Optional[Any] = None
    key_concept: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_question(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "id" not in data or not data["id"]:
                data["id"] = data.get("assessment_id") or data.get("check_id") or "Q_UNKNOWN"
            
            raw_ans = data.get("correct_answer") or data.get("answer") or ""
            correct_ans = str(raw_ans).strip()
            data["correct_answer"] = correct_ans
            opts = data.get("options")
            parsed_opts = []
            if isinstance(opts, list):
                parsed_opts = [str(o) for o in opts]
            elif isinstance(opts, dict):
                parsed_opts = [str(opts[k]) for k in sorted(opts.keys())]
            elif isinstance(opts, str) and opts.strip():
                parts = re.split(r'(?:^|\s+)[A-D]\.\s*', opts.strip())
                parsed_opts = [p.strip() for p in parts if p.strip()]
            
            if not parsed_opts:
                if data.get("type") == "True-False" or correct_ans.lower() in ["true", "false"]:
                    parsed_opts = ["True", "False"]
                elif correct_ans:
                    parsed_opts = [correct_ans]
                else:
                    parsed_opts = ["Correct"]
            
            data["options"] = parsed_opts

            if "explanation" not in data or not data["explanation"]:
                data["explanation"] = data.get("why_other_answers_are_wrong") or correct_ans

            if "correct_option_index" not in data or data["correct_option_index"] is None:
                correct_idx = 0
                if correct_ans in ["A", "a", "0"]:
                    correct_idx = 0
                elif correct_ans in ["B", "b", "1"]:
                    correct_idx = 1
                elif correct_ans in ["C", "c", "2"]:
                    correct_idx = 2
                elif correct_ans in ["D", "d", "3"]:
                    correct_idx = 3
                elif correct_ans.lower() == "true":
                    correct_idx = 0
                elif correct_ans.lower() == "false":
                    correct_idx = 1
                else:
                    for i, o in enumerate(parsed_opts):
                        if o.lower() == correct_ans.lower() or correct_ans.lower() in o.lower():
                            correct_idx = i
                            break
                if correct_idx >= len(parsed_opts):
                    correct_idx = 0
                data["correct_option_index"] = correct_idx

            if "explanation" not in data or not data["explanation"]:
                data["explanation"] = data.get("why_other_answers_are_wrong") or ""

            pof = data.get("per_option_feedback")
            if isinstance(pof, dict) and "option_feedback" not in data:
                data["option_feedback"] = [str(pof[k]) for k in sorted(pof.keys())]

        return data


class AssessmentsFile(BaseModel):
    """Schema for assessments.json."""
    topic_id: str
    assessments: List[AssessmentQuestion] = Field(default_factory=list)
    quick_understanding_checks: List[AssessmentQuestion] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_assessments_file(cls, data: Any) -> Any:
        if isinstance(data, dict):
            qc = data.get("quick_understanding_checks") or data.get("quick_checks") or []
            data["quick_understanding_checks"] = qc
            if not data.get("assessments"):
                data["assessments"] = qc
        return data


class EvalItem(BaseModel):
    """Evaluation item for automated benchmark testing."""
    model_config = ConfigDict(extra="allow")

    id: str
    question: str
    expected_key_points: List[str] = Field(default_factory=list)
    forbidden_points: List[str] = Field(default_factory=list)
    category: str = "general"
    expected_answer: Optional[str] = None
    expected_scope: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    source_fidelity: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_eval_item(cls, data: Any) -> Any:
        if isinstance(data, dict):
            iid = str(data.get("id", "")).lower()
            if "category" not in data or not data["category"]:
                if "out_of_scope" in iid:
                    data["category"] = "out_of_scope"
                elif "misconception" in iid:
                    data["category"] = "misconception"
                else:
                    data["category"] = "general"
        return data


class EvalFile(BaseModel):
    """Schema for eval.json."""
    topic_id: str
    evaluations: List[EvalItem]

    @model_validator(mode="before")
    @classmethod
    def normalize_eval_file(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "evaluations" not in data:
                data["evaluations"] = data.get("evaluation_items") or data.get("items") or []
        return data


class TopicPack(BaseModel):
    """Complete loaded topic pack combining all structured files."""
    manifest: TopicManifest
    concepts_file: ConceptsFile
    misconceptions_file: MisconceptionsFile
    examples_file: ExamplesFile
    ground_truth_file: GroundTruthFile
    assessments_file: AssessmentsFile
    eval_file: EvalFile
    content: Optional[Dict[str, Any]] = None

    def to_learner_view(self) -> Dict[str, Any]:
        """Return full learner-facing content (never exposes eval_file)."""
        return {
            "manifest": self.manifest.model_dump(),
            "concepts": [c.model_dump() for c in self.concepts_file.concepts],
            "misconceptions": [m.model_dump() for m in self.misconceptions_file.misconceptions],
            "examples": [e.model_dump() for e in self.examples_file.examples],
            "ground_truth": [g.model_dump() for g in self.ground_truth_file.rules],
            "assessments": [a.model_dump() for a in self.assessments_file.assessments],
            "quick_checks": [q.model_dump() for q in self.assessments_file.quick_understanding_checks],
            "content": self.content
        }
