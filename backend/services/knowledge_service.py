"""Knowledge service providing curriculum, lesson, and reference retrieval."""
from typing import List, Optional, Dict, Any
from backend.knowledge_base.loader import KnowledgeBase
from backend.models.learning import (
    Concept, Lesson, Misconception, Resource, WorkedExample, GroundTruthRule, TopicInfo
)


class KnowledgeService:
    """Service to interact with the curated quantum knowledge base."""

    def __init__(self):
        self.kb = KnowledgeBase.get_instance()

    def get_concepts(self, tier: Optional[int] = None, difficulty: Optional[str] = None) -> List[Concept]:
        concepts = self.kb.get_all_concepts()
        if tier is not None:
            concepts = [c for c in concepts if c.tier == tier]
        if difficulty is not None:
            concepts = [c for c in concepts if c.difficulty.lower() == difficulty.lower()]
        return concepts

    def get_concept_by_id(self, concept_id: str) -> Optional[Concept]:
        return self.kb.get_concept(concept_id)

    def get_lesson(self, concept_id: str) -> Optional[Lesson]:
        return self.kb.get_lesson(concept_id)

    def get_misconceptions(self, concept_id: Optional[str] = None) -> List[Misconception]:
        return self.kb.get_misconceptions(concept_id)

    def get_resources(self, concept_id: str) -> Optional[Resource]:
        return self.kb.get_resource(concept_id)

    def get_verification_report(self) -> Dict[str, Any]:
        return self.kb.get_verification_report()

    def get_topic(self, topic_id: str = "1.1") -> Optional[TopicInfo]:
        return self.kb.get_topic(topic_id)

    def get_all_topics(self) -> List[TopicInfo]:
        return self.kb.get_all_topics()

    def get_examples(self, topic_id: str = "1.1") -> List[WorkedExample]:
        return self.kb.get_examples(topic_id)

    def get_ground_truth(self, topic_id: str = "1.1") -> List[GroundTruthRule]:
        return self.kb.get_ground_truth(topic_id)
