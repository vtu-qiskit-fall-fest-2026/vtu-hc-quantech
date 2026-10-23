"""Unit tests verifying the Topic-Pack Architecture."""
import unittest
import tempfile
import json
from pathlib import Path

from backend.knowledge.loader import discover_and_load_topics, validate_and_load_pack, TopicLoadError
from backend.knowledge.registry import TopicRegistry, get_topic_registry


class TestTopicPackSystem(unittest.TestCase):
    """Verifies pack auto-discovery, validation, and ignoring template packs."""

    def test_discover_topics(self):
        """Registry discovers 1.1 and ignores _template."""
        registry = TopicRegistry()
        topic_ids = registry.loaded_topic_ids
        
        # 1.1 must be loaded
        self.assertIn("1.1", topic_ids)
        # _template must NOT be in loaded_topic_ids
        self.assertNotIn("_template", topic_ids)
        
        # Verify manifests
        manifests = registry.get_manifests()
        self.assertTrue(len(manifests) >= 1)
        self.assertEqual(manifests[0]["id"], "1.1")
        self.assertEqual(manifests[0]["status"], "ready")

    def test_learner_view_excludes_eval(self):
        """Learner view must never expose eval.json."""
        registry = TopicRegistry()
        view = registry.get_learner_view("1.1")
        self.assertIsNotNone(view)
        self.assertIn("manifest", view)
        self.assertIn("concepts", view)
        self.assertIn("misconceptions", view)
        self.assertIn("examples", view)
        self.assertIn("assessments", view)
        # eval must NEVER be in learner view
        self.assertNotIn("eval", view)
        self.assertNotIn("evaluations", view)

    def test_mathematical_mismatch_in_pack_rejected(self):
        """Loader rejects pack if example circuit produces probabilities different from declared."""
        with tempfile.TemporaryDirectory() as tmpdir:
            pack_dir = Path(tmpdir) / "invalid_math"
            pack_dir.mkdir()
            
            # Write minimal valid files with bad math
            manifest = {
                "id": "invalid_math",
                "title": "Bad Math Topic",
                "order": 99,
                "summary": "Tests math rejection",
                "estimated_minutes": 10,
                "status": "ready"
            }
            with open(pack_dir / "manifest.json", "w") as f:
                json.dump(manifest, f)
            with open(pack_dir / "concepts.json", "w") as f:
                json.dump({"topic_id": "invalid_math", "concepts": []}, f)
            with open(pack_dir / "misconceptions.json", "w") as f:
                json.dump({"topic_id": "invalid_math", "misconceptions": []}, f)
            with open(pack_dir / "ground_truth.json", "w") as f:
                json.dump({"topic_id": "invalid_math", "rules": []}, f)
            with open(pack_dir / "assessments.json", "w") as f:
                json.dump({"topic_id": "invalid_math", "assessments": []}, f)
            with open(pack_dir / "eval.json", "w") as f:
                json.dump({"topic_id": "invalid_math", "evaluations": []}, f)
                
            # Example with H gate (produces 50/50) but claims 100% on 0
            examples = {
                "topic_id": "invalid_math",
                "examples": [
                    {
                        "id": "EX_BAD",
                        "title": "Bad Example",
                        "question": "Q?",
                        "steps": [],
                        "answer": "Ans",
                        "circuit": {
                            "num_qubits": 1,
                            "operations": [{"gate": "H", "qubits": [0]}]
                        },
                        "expected_probabilities": {"0": 1.0, "1": 0.0}
                    }
                ]
            }
            with open(pack_dir / "examples.json", "w") as f:
                json.dump(examples, f)
                
            with self.assertRaises(TopicLoadError):
                validate_and_load_pack(pack_dir)


if __name__ == "__main__":
    unittest.main()
