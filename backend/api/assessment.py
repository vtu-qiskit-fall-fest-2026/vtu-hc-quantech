"""Assessment and Quick-Check API endpoints."""
from fastapi import APIRouter, HTTPException

from backend.models.learning import AssessmentCheckRequest, AssessmentCheckResponse
from backend.knowledge.registry import get_topic_registry

router = APIRouter(prefix="/assessment", tags=["Assessment"])


@router.post("/check", response_model=AssessmentCheckResponse)
async def check_assessment(request: AssessmentCheckRequest):
    """Check student answer against topic assessment pack."""
    registry = get_topic_registry()
    topic_pack = registry.get_topic(request.topic_id)
    if not topic_pack:
        raise HTTPException(
            status_code=404,
            detail=f"Topic '{request.topic_id}' not found."
        )

    # Find question in assessments
    target_q = None
    for q in topic_pack.assessments_file.assessments:
        if q.id == request.question_id:
            target_q = q
            break

    if not target_q:
        raise HTTPException(
            status_code=404,
            detail=f"Question '{request.question_id}' not found in topic '{request.topic_id}'."
        )

    is_correct = (request.selected_option == target_q.correct_option_index)
    
    # Get option feedback if provided
    feedback = ""
    if target_q.option_feedback and 0 <= request.selected_option < len(target_q.option_feedback):
        feedback = target_q.option_feedback[request.selected_option]
    else:
        feedback = "Correct!" if is_correct else "Incorrect. Review the concept explanation."

    return AssessmentCheckResponse(
        topic_id=request.topic_id,
        question_id=request.question_id,
        is_correct=is_correct,
        correct_option_index=target_q.correct_option_index,
        feedback=feedback,
        explanation=target_q.explanation
    )
