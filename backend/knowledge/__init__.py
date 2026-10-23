"""Knowledge package for topic-pack registry and retrieval."""
from backend.knowledge.schema import TopicManifest, Concept, Misconception, WorkedExample, TopicPack
from backend.knowledge.loader import discover_and_load_topics, validate_and_load_pack
from backend.knowledge.registry import TopicRegistry, get_topic_registry
from backend.knowledge.retriever import TopicRetriever, RetrievalResult

__all__ = [
    "TopicManifest",
    "Concept",
    "Misconception",
    "WorkedExample",
    "TopicPack",
    "discover_and_load_topics",
    "validate_and_load_pack",
    "TopicRegistry",
    "get_topic_registry",
    "TopicRetriever",
    "RetrievalResult"
]
