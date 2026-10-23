"""Tests for PedagogyClassifierService, model loading, CPU inference, and fallback."""
import os
import unittest
from pathlib import Path

from backend.ai.classifier import (
    PedagogyClassifierService,
    QuantumPedagogyModel,
    SimpleTokenizer,
    CATEGORIES,
    TOPICS
)
from backend.ai.tutor import get_tutor_service, AITutorService


class TestPedagogyClassifier(unittest.TestCase):
    """Verifies neural classifier behavior, CPU execution, and graceful fallback."""

    def setUp(self):
        self.service = PedagogyClassifierService()

    def test_classifier_loads_successfully_on_cpu(self):
        """Model checkpoint should load on CPU without error."""
        self.assertTrue(self.service.is_available, "Pedagogy classifier should load successfully.")
        self.assertIsNotNone(self.service.model)
        self.assertIsNotNone(self.service.tokenizer)
        self.assertIsInstance(self.service.model, QuantumPedagogyModel)
        self.assertIsInstance(self.service.tokenizer, SimpleTokenizer)

    def test_inference_returns_valid_structure(self):
        """Inference on query produces category, topic, misconception, and probability scores."""
        query = "What is a qubit and how does it store quantum information?"
        result = self.service.classify(query)

        self.assertIsNotNone(result)
        self.assertIn("predicted_category", result)
        self.assertIn(result["predicted_category"], CATEGORIES)
        self.assertIn("predicted_topic", result)
        self.assertIn(result["predicted_topic"], TOPICS)
        self.assertIn("is_misconception", result)
        self.assertIsInstance(result["is_misconception"], bool)
        self.assertIn("category_confidence", result)
        self.assertIn("topic_confidence", result)
        self.assertIn("misconception_confidence", result)
        self.assertTrue(0.0 <= result["category_confidence"] <= 1.0)
        self.assertTrue(0.0 <= result["topic_confidence"] <= 1.0)
        self.assertTrue(0.0 <= result["misconception_confidence"] <= 1.0)

    def test_empty_or_whitespace_query_handling(self):
        """Gracefully handle empty string or whitespace without exceptions."""
        self.assertIsNone(self.service.classify(""))
        self.assertIsNone(self.service.classify("   "))

    def test_graceful_fallback_on_missing_model_checkpoint(self):
        """When pointed to a non-existent directory, service marks itself unavailable and returns None."""
        fake_path = Path("fake_non_existent_artifacts_dir")
        fallback_service = PedagogyClassifierService(artifacts_dir=fake_path)
        self.assertFalse(fallback_service.is_available)
        self.assertIsNone(fallback_service.model)
        self.assertIsNone(fallback_service.classify("What is quantum computing?"))

    def test_singleton_reuse_in_tutor_service(self):
        """Tutor service initializes the classifier once and reuses the instance."""
        tutor = get_tutor_service()
        self.assertIsNotNone(tutor.classifier)
        self.assertTrue(tutor.classifier.is_available)
        
        # Verify model object identity is preserved across multiple questions
        model_instance_1 = tutor.classifier.model
        resp1 = tutor.ask("What is quantum computing?")
        resp2 = tutor.ask("What is a classical bit?")
        model_instance_2 = tutor.classifier.model
        self.assertIs(model_instance_1, model_instance_2, "Classifier model must not be re-instantiated per query.")

    def test_tutor_ask_contains_classification_metadata(self):
        """Tutor response contains classification field produced by the neural classifier."""
        tutor = get_tutor_service()
        resp = tutor.ask("What is the difference between classical bits and qubits?")
        self.assertIn("classification", resp)
        self.assertIsNotNone(resp["classification"])
        self.assertIn("predicted_category", resp["classification"])
        self.assertIn("predicted_topic", resp["classification"])
        self.assertEqual(resp["topic_id"], "1.2")


if __name__ == "__main__":
    unittest.main()
