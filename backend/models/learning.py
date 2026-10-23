"""Pydantic models for learning and assessment."""
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from backend.models.tutor import TutorAskRequest, TutorAskResponse


class AssessmentCheckRequest(BaseModel):
    topic_id: str = Field(..., description="Active topic ID")
    question_id: str = Field(..., description="Question ID being answered")
    selected_option: int = Field(..., description="0-indexed chosen option")


class AssessmentCheckResponse(BaseModel):
    topic_id: str
    question_id: str
    is_correct: bool
    correct_option_index: int
    feedback: str
    explanation: str
