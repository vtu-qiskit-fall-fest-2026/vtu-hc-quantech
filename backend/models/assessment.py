"""Assessment and coding challenge models for QuantumLearnAI."""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from backend.models.circuit import CircuitModel


class QuizSubmission(BaseModel):
    """Submission for a concept quiz."""
    concept_id: str
    answers: Dict[str, int] = Field(..., description="Map of question index/id to chosen option index")


class QuizFeedbackItem(BaseModel):
    """Feedback item for a single quiz question."""
    question_index: int
    user_answer: int
    correct_answer: int
    is_correct: bool
    explanation: str
    misconception: Optional[str] = None


class QuizResult(BaseModel):
    """Grading result for a concept quiz."""
    concept_id: str
    total_questions: int
    correct_count: int
    score_percentage: float
    passed: bool
    feedback: List[QuizFeedbackItem] = Field(default_factory=list)


class Challenge(BaseModel):
    """Quantum circuit puzzle challenge."""
    id: str
    title: str
    difficulty: str
    description: str
    prompt: str
    qubits: int = 1
    allowed_gates: List[str] = Field(default_factory=list)
    target_state: Optional[str] = None
    target_probabilities: Dict[str, float] = Field(default_factory=dict)
    solution_circuit: Optional[List[Any]] = None


class ChallengeSubmission(BaseModel):
    """Submission of a circuit attempting to solve a challenge."""
    challenge_id: str
    circuit: CircuitModel


class ChallengeResult(BaseModel):
    """Auto-grader result for a circuit challenge."""
    challenge_id: str
    passed: bool
    fidelity: float
    measured_probabilities: Dict[str, float]
    target_probabilities: Dict[str, float]
    feedback: str
    hint: Optional[str] = None
