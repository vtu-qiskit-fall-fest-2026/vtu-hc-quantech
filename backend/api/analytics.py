"""Analytics and recommendation API router for QuantumLearnAI."""
from fastapi import APIRouter, HTTPException
from backend.models.analytics import ProgressUpdateRequest, UserMasteryProfile, Recommendation, PlatformOverview
from backend.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/analytics", tags=["Analytics"])
recommendation_service = RecommendationService()


@router.get("/progress/{user_id}", response_model=UserMasteryProfile)
async def get_user_progress(user_id: str):
    """Retrieves learner EWMA mastery profile and completed topics."""
    return recommendation_service.get_or_create_profile(user_id)


@router.post("/progress/update", response_model=UserMasteryProfile)
async def update_user_progress(req: ProgressUpdateRequest):
    """Updates learner score using EWMA formula and unlocks subsequent curriculum milestones."""
    return recommendation_service.update_progress(req)


@router.get("/recommendation/{user_id}", response_model=Recommendation)
async def get_next_recommendation(user_id: str):
    """Computes personalized next concept recommendation with explicit 'why this next' rationale."""
    return recommendation_service.recommend_next_concept(user_id)


@router.get("/overview", response_model=PlatformOverview)
async def get_platform_overview():
    """Returns platform-wide metrics, verification statistics, and active learner counts."""
    return recommendation_service.get_platform_overview()
