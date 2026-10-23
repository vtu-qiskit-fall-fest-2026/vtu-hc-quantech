"""Tutor API endpoints."""
from fastapi import APIRouter, HTTPException

from backend.models.tutor import TutorAskRequest, TutorAskResponse
from backend.ai.tutor import get_tutor_service

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])


@router.post("/ask", response_model=TutorAskResponse)
async def ask_tutor(request: TutorAskRequest):
    """Ask the educational tutor with grounded simulator telemetry and validation."""
    try:
        tutor_service = get_tutor_service()
        learning_ctx_dict = request.learning_context.model_dump() if request.learning_context else None

        circuit_dict = request.circuit.model_dump() if request.circuit else (
            request.learning_context.circuit.model_dump() if (request.learning_context and request.learning_context.circuit) else None
        )
        topic_id = request.topic_id or (
            request.learning_context.topic_id if request.learning_context else None
        ) or (tutor_service.registry.loaded_topic_ids[0] if tutor_service.registry.loaded_topic_ids else None)

        concept_id = request.concept_id or (
            request.learning_context.concept_id if request.learning_context else None
        )

        client_sim = request.simulation_result or (
            request.learning_context.simulation_result if request.learning_context else None
        )

        result = tutor_service.ask(
            question=request.question,
            topic_id=topic_id,
            concept_id=concept_id,
            circuit=circuit_dict,
            client_simulation_result=client_sim,
            conversation_history=request.conversation_history,
            quiz_state=request.quiz_state,
            learning_context=learning_ctx_dict
        )
        return TutorAskResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tutor service encountered an error: {str(e)}"
        )
