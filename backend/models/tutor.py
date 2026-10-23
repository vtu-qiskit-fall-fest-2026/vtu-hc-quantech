"""Pydantic models for Tutor requests and responses."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.models.circuit import CircuitModel


class VisibleVisualModel(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    caption: Optional[str] = None
    data: Optional[Any] = None
    description: Optional[str] = None


class StudentStateModel(BaseModel):
    visited_topics: List[str] = Field(default_factory=list)
    completed_topics: List[str] = Field(default_factory=list)
    quiz_history: List[Dict[str, Any]] = Field(default_factory=list)
    weak_concepts: List[str] = Field(default_factory=list)
    mastery: Dict[str, Any] = Field(default_factory=dict)
    circuits_run_count: int = 0


class LearningContextModel(BaseModel):
    route: Optional[str] = None
    module_id: Optional[str] = None
    module_title: Optional[str] = None
    topic_id: Optional[str] = None
    topic_title: Optional[str] = None
    concept_id: Optional[str] = None
    concept_title: Optional[str] = None
    section_id: Optional[str] = None
    section_title: Optional[str] = None
    visible_content_id: Optional[str] = None
    visible_content_type: Optional[str] = None
    visible_visual: Optional[VisibleVisualModel] = None
    circuit: Optional[CircuitModel] = None
    simulation_result: Optional[Dict[str, Any]] = None
    student_state: Optional[StudentStateModel] = None


class TutorAskRequest(BaseModel):
    question: str = Field(..., description="Student's natural language question")
    topic_id: Optional[str] = Field(default=None, description="Active topic ID")
    concept_id: Optional[str] = Field(default=None, description="Active concept ID if any")
    circuit: Optional[CircuitModel] = Field(default=None, description="Current circuit on canvas if any")
    simulation_result: Optional[Dict[str, Any]] = Field(default=None, description="Client telemetry if any (server re-simulates)")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=None, description="Recent conversation turns")
    quiz_state: Optional[Dict[str, Any]] = Field(default=None, description="Current structured quiz state if quiz active")
    learning_context: Optional[LearningContextModel] = Field(default=None, description="Unified frontend learning context")


class TutorSource(BaseModel):
    type: str
    id: str
    topic_id: Optional[str] = None


class ValidationReport(BaseModel):
    passed: bool
    checks: List[Dict[str, Any]] = Field(default_factory=list)


class TutorAskResponse(BaseModel):
    answer: str
    verified: bool
    based_on_simulation: bool
    topic_id: str
    generated_by: str # 'llm' or 'fallback'
    model: Optional[str] = None
    sources: List[TutorSource] = Field(default_factory=list)
    validation: ValidationReport
    quiz_state: Optional[Dict[str, Any]] = Field(default=None, description="Updated structured quiz state")
