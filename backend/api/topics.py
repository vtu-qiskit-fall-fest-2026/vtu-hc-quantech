"""Topics and Gates API endpoints.

Topic-agnostic: discovers packs from disk and serves dynamic registries.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

from backend.knowledge.registry import get_topic_registry
from backend.quantum.gates import list_gates

router = APIRouter(tags=["Topics & Gates"])


@router.get("/topics", response_model=List[Dict[str, Any]])
async def get_topics():
    """Retrieve all available topic manifests, sorted by curriculum order."""
    registry = get_topic_registry()
    return registry.get_manifests()


@router.get("/topics/{topic_id}", response_model=Dict[str, Any])
async def get_topic_details(topic_id: str):
    """Retrieve full learner-facing content for a topic (excludes eval.json)."""
    registry = get_topic_registry()
    learner_view = registry.get_learner_view(topic_id)
    if not learner_view:
        raise HTTPException(
            status_code=404,
            detail=f"Topic '{topic_id}' not found or failed validation."
        )
    return learner_view


@router.get("/gates", response_model=List[Dict[str, Any]])
async def get_gates():
    """Retrieve all registered quantum gates for palette rendering."""
    return list_gates()
