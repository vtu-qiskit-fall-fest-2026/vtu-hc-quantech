"""Analytics and personalized learning models for QuantumLearnAI."""
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class ProgressUpdateRequest(BaseModel):
    """User learning progress update payload."""
    user_id: str
    concept_id: str
    score: float = Field(..., ge=0.0, le=1.0)
    time_spent_seconds: int = 60
    completed: bool = True


class UserMasteryProfile(BaseModel):
    """Cumulative mastery profile of a user based on EWMA scores."""
    user_id: str
    mastery: Dict[str, float] = Field(default_factory=dict, description="concept_id -> EWMA mastery [0, 1]")
    completed_concepts: List[str] = Field(default_factory=list)
    total_time_seconds: int = 0
    level: str = "Beginner"


class Recommendation(BaseModel):
    """Adaptive next-concept recommendation."""
    recommended_concept_id: str
    concept_title: str
    tier: int
    tier_name: str
    difficulty: str
    why_this_next: str
    readiness_score: float
    prerequisites_completed: List[str] = Field(default_factory=list)
    prerequisites_missing: List[str] = Field(default_factory=list)


class PlatformOverview(BaseModel):
    """Platform-wide analytics for instructor dashboards and SIH defense."""
    total_concepts: int
    total_lessons: int
    verified_lessons: int
    verification_rate_percent: float
    simulator_backends: List[str]
    active_learners: int
    pending_expert_reviews: int
