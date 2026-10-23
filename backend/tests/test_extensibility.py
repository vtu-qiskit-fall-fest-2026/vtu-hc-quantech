"""Verification test demonstrating zero-code-change topic extensibility.

Copies _template to a temporary test pack, verifies discovery and validation,
confirms API return, and cleans up.
"""
import shutil
import json
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app
from backend.knowledge.registry import TopicRegistry, DEFAULT_TOPICS_DIR
from backend.knowledge.loader import validate_and_load_pack

client = TestClient(app)


class TestTopicExtensibility(unittest.TestCase):
    """Demonstrates adding a new topic requires ZERO code changes."""

    def test_add_topic_workflow(self):
        template_dir = DEFAULT_TOPICS_DIR / "_template"
        test_pack_dir = DEFAULT_TOPICS_DIR / "9.9"

        try:
            # 1. Copy _template to new folder
            if test_pack_dir.exists():
                shutil.rmtree(test_pack_dir)
            shutil.copytree(template_dir, test_pack_dir)

            # 2. Update manifest and pack topic_id to "9.9"
            manifest_path = test_pack_dir / "manifest.json"
            manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest_data["id"] = "9.9"
            manifest_data["title"] = "Quantum Extensibility Demo"
            manifest_data["order"] = 99
            manifest_data["status"] = "ready"
            manifest_path.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")

            # Update topic_id in all sub-files
            for fname in ["concepts.json", "misconceptions.json", "examples.json", "ground_truth.json", "assessments.json", "eval.json"]:
                fpath = test_pack_dir / fname
                data = json.loads(fpath.read_text(encoding="utf-8"))
                data["topic_id"] = "9.9"
                fpath.write_text(json.dumps(data, indent=2), encoding="utf-8")

            # 3. Validate and load pack directly
            pack = validate_and_load_pack(test_pack_dir)
            self.assertEqual(pack.manifest.id, "9.9")
            self.assertEqual(pack.manifest.title, "Quantum Extensibility Demo")

            # 4. Confirm it appears via API with ZERO code changes
            registry = TopicRegistry()
            self.assertIn("9.9", registry.loaded_topic_ids)

            # Test API endpoint /api/topics
            res = client.get("/api/topics")
            self.assertEqual(res.status_code, 200)
            topic_ids = [t["id"] for t in res.json()]
            self.assertIn("9.9", topic_ids)

            # Test API endpoint /api/topics/9.9
            res_topic = client.get("/api/topics/9.9")
            self.assertEqual(res_topic.status_code, 200)
            data_topic = res_topic.json()
            self.assertEqual(data_topic["manifest"]["title"], "Quantum Extensibility Demo")

        finally:
            # Clean up test pack
            if test_pack_dir.exists():
                shutil.rmtree(test_pack_dir)

        # Confirm cleanly removed
        clean_registry = TopicRegistry()
        self.assertNotIn("9.9", clean_registry.loaded_topic_ids)


if __name__ == "__main__":
    unittest.main()
