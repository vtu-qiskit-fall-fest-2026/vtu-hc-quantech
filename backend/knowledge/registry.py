"""In-memory Topic Registry.

Maintains the loaded topic packs discovered by the loader.
Completely topic-agnostic; serves queries dynamically.
"""
from pathlib import Path
from typing import Dict, List, Optional, Any

from backend.knowledge.loader import discover_and_load_topics, TopicPack
from backend.knowledge.schema import Misconception, GroundTruthRule

DEFAULT_TOPICS_DIR = Path(__file__).resolve().parent / "topics"


class TopicRegistry:
    """Registry maintaining active topic packs."""

    def __init__(self, topics_dir: Optional[Path] = None):
        self.topics_dir = topics_dir or DEFAULT_TOPICS_DIR
        self._packs: Dict[str, TopicPack] = {}
        self.reload()

    def reload(self) -> None:
        """Scan and reload all valid packs from disk."""
        self._packs = discover_and_load_topics(self.topics_dir)

    def get_manifests(self) -> List[Dict[str, Any]]:
        """Return all valid topic manifests with concepts_count and assessments_count, sorted by order."""
        self.reload()
        manifests = []
        for pack in self._packs.values():
            m_dict = pack.manifest.model_dump()
            m_dict["concepts_count"] = len(pack.concepts_file.concepts)
            m_dict["assessments_count"] = len(pack.assessments_file.assessments) + len(pack.assessments_file.quick_understanding_checks)
            manifests.append(m_dict)
        manifests.sort(key=lambda m: m["order"])
        return manifests

    def get_topic(self, topic_id: str) -> Optional[TopicPack]:
        """Retrieve full topic pack by ID."""
        if topic_id not in self._packs:
            self.reload()
        return self._packs.get(topic_id)

    def get_learner_view(self, topic_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve learner-facing content (manifest, concepts, misconceptions, examples, assessments)."""
        pack = self._packs.get(topic_id)
        if not pack:
            return None
        return pack.to_learner_view()

    def get_all_forbidden_phrases(self) -> List[str]:
        """Aggregate forbidden phrases across all loaded topic packs for the validator."""
        phrases = set()
        for pack in self._packs.values():
            for m in pack.misconceptions_file.misconceptions:
                for phrase in m.forbidden_phrases:
                    phrases.add(phrase)
        return list(phrases)

    def get_all_misconceptions(self) -> List[Misconception]:
        """Aggregate all misconceptions from all loaded packs."""
        all_m = []
        for pack in self._packs.values():
            all_m.extend(pack.misconceptions_file.misconceptions)
        return all_m

    def get_all_ground_truth_rules(self) -> List[GroundTruthRule]:
        """Aggregate all ground truth rules from all loaded packs."""
        rules = []
        for pack in self._packs.values():
            rules.extend(pack.ground_truth_file.rules)
        return rules

    @property
    def loaded_topic_ids(self) -> List[str]:
        return list(self._packs.keys())


# Singleton instance
_registry_instance: Optional[TopicRegistry] = None


def get_topic_registry() -> TopicRegistry:
    """Get or initialize the global TopicRegistry singleton."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = TopicRegistry()
    return _registry_instance
