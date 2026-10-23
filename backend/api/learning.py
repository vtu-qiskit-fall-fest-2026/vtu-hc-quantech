"""Learning curriculum and knowledge base API router for QuantumLearnAI."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from backend.models.learning import (
    Concept, Lesson, Misconception, Resource, WorkedExample, GroundTruthRule, TopicInfo
)
from backend.services.knowledge_service import KnowledgeService

router = APIRouter(prefix="/learning", tags=["Learning"])
knowledge_service = KnowledgeService()


@router.get("/concepts", response_model=List[Concept])
async def get_concepts(
    tier: Optional[int] = Query(default=None, ge=1, le=5),
    difficulty: Optional[str] = Query(default=None)
):
    """Retrieves all curriculum concepts with optional filtering by tier or difficulty."""
    return knowledge_service.get_concepts(tier=tier, difficulty=difficulty)


@router.get("/concepts/{concept_id}", response_model=Concept)
async def get_concept_by_id(concept_id: str):
    """Retrieves a specific concept by its ID."""
    concept = knowledge_service.get_concept_by_id(concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail=f"Concept '{concept_id}' not found.")
    return concept


@router.get("/lessons/{concept_id}", response_model=Lesson)
async def get_lesson_by_concept_id(concept_id: str):
    """Retrieves full lesson content, intuition, math, quiz, and verification data for a concept."""
    lesson = knowledge_service.get_lesson(concept_id)
    if not lesson:
        raise HTTPException(status_code=404, detail=f"Lesson for concept '{concept_id}' not found.")
    return lesson


@router.get("/misconceptions/{concept_id}", response_model=List[Misconception])
async def get_misconceptions(concept_id: str):
    """Retrieves curated misconceptions and refutations for a concept."""
    return knowledge_service.get_misconceptions(concept_id)


@router.get("/resources/{concept_id}", response_model=Optional[Resource])
async def get_resources(concept_id: str):
    """Retrieves book citations and academic references for a concept."""
    res = knowledge_service.get_resources(concept_id)
    if not res:
        return Resource(concept_id=concept_id, citations=[])
    return res


@router.get("/verification-report")
async def get_verification_report():
    """Returns the verifier report showing mathematical fidelity of all curriculum lessons."""
    return knowledge_service.get_verification_report()


@router.get("/topics", response_model=List[TopicInfo])
async def get_all_topics():
    """Retrieves all high-level curriculum topics (e.g. Topic 1.1)."""
    return knowledge_service.get_all_topics()


@router.get("/topics/{topic_id}", response_model=TopicInfo)
async def get_topic_by_id(topic_id: str):
    """Retrieves metadata, tags, objectives, and concepts for a specific topic."""
    topic = knowledge_service.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found.")
    return topic


@router.get("/examples/{topic_id}", response_model=List[WorkedExample])
async def get_examples(topic_id: str):
    """Retrieves worked mathematical and circuit examples for a topic."""
    return knowledge_service.get_examples(topic_id)


@router.get("/ground-truth/{topic_id}", response_model=List[GroundTruthRule])
async def get_ground_truth(topic_id: str):
    """Retrieves verifiable ground truth rules for a topic."""
    return knowledge_service.get_ground_truth(topic_id)
