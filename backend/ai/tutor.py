"""Tutor Orchestrator.

Integrates:
- Data-driven intent detection & scoped semantic retrieval.
- Server-side circuit re-simulation (never trusting client probabilities).
- Ollama LLM execution with automatic fallback to deterministic tutor.
- Validation layer.
- Honest labeling: 'generated_by': 'llm' or 'fallback'.
"""
import os
import re
import time
import logging
from typing import Dict, Any, Optional, List
import httpx

from backend.knowledge.registry import TopicRegistry, get_topic_registry
from backend.knowledge.retriever import TopicRetriever, RetrievalResult
from backend.quantum.simulator import simulate_circuit
from backend.ai.prompts import build_tutor_prompt, format_curriculum_context, SYSTEM_PROMPT
from backend.ai.validator import ResponseValidator, ValidationResult
from backend.ai.fallback import DeterministicFallbackTutor
from backend.ai.quiz_engine import QuizEngine

logger = logging.getLogger("AITutor")

OLLAMA_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "llama3"


def _load_env_file():
    """Load key-value pairs from root .env file into os.environ if present."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_path = os.path.join(base_dir, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except Exception:
            pass

_load_env_file()


from backend.ai.providers import get_llm_provider
from backend.ai.classifier import PedagogyClassifierService


class AITutorService:
    """Orchestrates topic-agnostic educational tutoring using pluggable LLM Providers."""

    def __init__(self, registry: Optional[TopicRegistry] = None):
        self.registry = registry or get_topic_registry()
        self.retriever = TopicRetriever(self.registry)
        self.validator = ResponseValidator()
        self.fallback_tutor = DeterministicFallbackTutor()
        self.quiz_engine = QuizEngine(self.registry)
        self.llm_provider = get_llm_provider()
        self.classifier = PedagogyClassifierService()

    def check_llm_status(self) -> Dict[str, Any]:
        """Check status of active LLM provider."""
        return self.llm_provider.get_status()

    def check_ollama_status(self) -> Dict[str, Any]:
        """Legacy helper for backward compatibility."""
        return self.check_llm_status()

    def _call_llm(
        self,
        prompt: str,
        llm_info: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        max_tokens: int = 280
    ) -> Optional[str]:
        """Route prompt to configured LLM provider."""
        return self.llm_provider.generate(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            conversation_history=conversation_history,
            max_tokens=max_tokens
        )

    def ask(
        self,
        question: str,
        topic_id: Optional[str] = None,
        concept_id: Optional[str] = None,
        circuit: Optional[Dict[str, Any]] = None,
        client_simulation_result: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        quiz_state: Optional[Dict[str, Any]] = None,
        learning_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process student question with grounded verification and honest labeling."""
        if learning_context:
            if not topic_id:
                topic_id = learning_context.get("topic_id")
            if not concept_id:
                concept_id = learning_context.get("concept_id")
            if not circuit:
                circuit = learning_context.get("circuit")
            if not client_simulation_result:
                client_simulation_result = learning_context.get("simulation_result")

        visible_visual = learning_context.get("visible_visual") if learning_context else None

        # 0. Neural Pedagogy Classifier inference (CPU singleton)
        classification = self.classifier.classify(question) if (self.classifier and self.classifier.is_available) else None

        q_lower = question.lower()
        if not topic_id:
            # Dynamic topic matching from registry manifests (topic-agnostic, zero hardcoded topics)
            best_topic_id = None
            best_topic_score = -1.0
            q_clean_words = set(re.findall(r"\w+", q_lower)) - {"what", "is", "a", "an", "the", "in", "of", "to", "and", "or", "difference", "between", "tell", "me", "explain", "it"}
            for t_id in self.registry.loaded_topic_ids:
                pack = self.registry.get_topic(t_id)
                if not pack:
                    continue
                score = 0.0
                title_lower = pack.manifest.title.lower().replace("versus", "vs")
                # Exact phrase match in query
                clean_title = title_lower.replace("?", "").strip()
                if clean_title in q_lower:
                    score += 50.0

                title_words = set(w.rstrip("s") for w in re.findall(r"\w+", title_lower) if w not in {"what", "is", "vs", "versus"})
                q_stems = set(w.rstrip("s") for w in q_clean_words)
                if title_words:
                    matched_words = len(q_stems & title_words)
                    overlap_ratio = matched_words / len(title_words)
                    score += matched_words * 15.0 + overlap_ratio * 25.0

                # Specific unique curriculum domain terms from concepts
                for c in pack.concepts_file.concepts:
                    c_title = c.title.lower()
                    if c_title in q_lower and c_title not in ["quantum computing", "quantum", "computing", "classical"]:
                        score += 20.0
                    c_terms = set(re.findall(r"\w+", c_title)) - {"quantum", "computing", "classical"}
                    if c_terms and (q_clean_words & c_terms):
                        score += len(q_clean_words & c_terms) * 5.0

                if score > best_topic_score:
                    best_topic_score = score
                    best_topic_id = t_id

            if best_topic_id and best_topic_score >= 10.0:
                topic_id = best_topic_id
            elif classification and classification.get("predicted_topic") and classification.get("topic_confidence", 0.0) >= 0.35:
                topic_id = classification["predicted_topic"]
            else:
                topic_id = self.registry.loaded_topic_ids[0] if self.registry.loaded_topic_ids else None

        llm_status = self.check_llm_status()
        gen_by = "llm" if llm_status["available"] else "fallback"
        model_name = llm_status.get("model") if gen_by == "llm" else None

        # 0. Intent Detection with quiz_state context
        intent, is_telem = self.retriever.detect_intent(question, quiz_state)

        # Handle QUIZ_REQUEST intent ("Quiz me", "Quiz me on this concept", "Test me", "Ask me a question", "Quiz me on superposition")
        if intent in ["quiz_request", "quiz_me"]:
            resolved_topic_id = self.quiz_engine.resolve_topic_for_query(question, topic_id)
            answer_text, new_quiz_state, sources, gen_source = self.quiz_engine.start_quiz(
                topic_id=resolved_topic_id,
                concept_id=concept_id,
                llm_provider=self.llm_provider if llm_status["available"] else None
            )
            val_result = self.validator.validate(answer=answer_text)
            return {
                "answer": answer_text,
                "verified": val_result.passed,
                "based_on_simulation": False,
                "topic_id": resolved_topic_id,
                "generated_by": gen_source,
                "model": model_name if gen_source == "llm" else None,
                "sources": sources,
                "validation": {
                    "passed": val_result.passed,
                    "checks": val_result.checks
                },
                "quiz_state": new_quiz_state,
                "classification": classification
            }

        # Handle QUIZ_ANSWER intent when quiz is active (e.g. user answered "B", "The answer is B", etc.)
        if intent == "quiz_answer" and quiz_state and quiz_state.get("mode") == "quiz":
            answer_text, new_quiz_state, sources = self.quiz_engine.evaluate_answer(question, quiz_state)
            val_result = self.validator.validate(answer=answer_text)
            return {
                "answer": answer_text,
                "verified": val_result.passed,
                "based_on_simulation": False,
                "topic_id": quiz_state.get("topicId", topic_id),
                "generated_by": "quiz_engine",
                "model": None,
                "sources": sources,
                "validation": {
                    "passed": val_result.passed,
                    "checks": val_result.checks
                },
                "quiz_state": new_quiz_state,
                "classification": classification
            }

        # Handle QUIZ_EXPLANATION intent ("Why is B correct?")
        if intent == "quiz_explanation" and quiz_state:
            explanation_text = quiz_state.get("explanation", "")
            correct_letter = quiz_state.get("correctLetter", "B")
            curr_q = quiz_state.get("currentQuestion", "")
            ans_str = (
                f"### Quiz Answer Explanation\n\n"
                f"**Question:** {curr_q}\n\n"
                f"**Option {correct_letter}** is the correct answer.\n\n"
                f"**Explanation:** {explanation_text}"
            )
            val_result = self.validator.validate(answer=ans_str)
            return {
                "answer": ans_str,
                "verified": val_result.passed,
                "based_on_simulation": False,
                "topic_id": quiz_state.get("topicId", topic_id),
                "generated_by": "curriculum_pack",
                "model": None,
                "sources": [{"type": "assessment", "id": "explanation", "topic_id": topic_id}],
                "validation": {
                    "passed": val_result.passed,
                    "checks": val_result.checks
                },
                "quiz_state": quiz_state,
                "classification": classification
            }

        # 1. Server-side circuit re-simulation (Mathematical Authority)
        server_telemetry = None
        based_on_simulation = False
        
        if circuit and circuit.get("operations"):
            try:
                server_telemetry = simulate_circuit(circuit)
                based_on_simulation = True
            except Exception as e:
                logger.warning(f"Server-side simulation encountered error: {e}")

        # 2. Scoped semantic retrieval
        is_misc_pred = bool(classification and (classification.get("is_misconception") or classification.get("predicted_category") == "D_Misconceptions"))
        retrieval: RetrievalResult = self.retriever.retrieve(
            query=question,
            current_topic_id=topic_id,
            concept_id=concept_id,
            visible_visual=visible_visual,
            has_circuit=bool(server_telemetry),
            learning_context=learning_context,
            is_misconception_predicted=is_misc_pred
        )

        all_forbidden = self.registry.get_all_forbidden_phrases()
        
        # 3. Mandatory Backend Logging in Development Mode
        retrieved_curriculum_log = "\n\n".join(retrieval.retrieved_chunks) if retrieval.retrieved_chunks else "(None)"
        chunk_count = len(retrieval.retrieved_chunks)
        context_sent_to_ollama = format_curriculum_context(retrieval, server_telemetry)

        if os.getenv("DEBUG", "false").lower() == "true":
            print("\n" + "=" * 60)
            print("QUESTION:")
            print(question)
            print("\nRETRIEVED CURRICULUM:")
            print(retrieved_curriculum_log)
            print(f"\nRETRIEVAL RESULT COUNT:\n{chunk_count}")
            print("\nCONTEXT SENT TO OLLAMA:")
            print(context_sent_to_ollama)
            print("=" * 60 + "\n")

        # 4. Check LLM availability & call provider
        answer = None
        generated_by = "fallback"
        model_used = None
        
        if llm_status["available"]:
            model_name = llm_status["model"]
            prompt = build_tutor_prompt(question, retrieval, server_telemetry, all_forbidden)
            llm_text = self._call_llm(prompt, llm_status, conversation_history)
            
            if llm_text:
                # 5. Validate LLM response
                val_result = self.validator.validate(
                    answer=llm_text,
                    telemetry=server_telemetry,
                    pack_forbidden_phrases=all_forbidden,
                    is_out_of_scope=retrieval.is_out_of_scope
                )
                if val_result.passed:
                    answer = llm_text
                    generated_by = "llm"
                    model_used = model_name
                else:
                    # Retry once with validation critique
                    critique_prompt = f"{prompt}\n\nPREVIOUS GENERATION ERROR: {', '.join(val_result.reasons)}. Please correct and regenerate."
                    retry_text = self._call_llm(critique_prompt, llm_status, conversation_history)
                    if retry_text:
                        val_retry = self.validator.validate(
                            answer=retry_text,
                            telemetry=server_telemetry,
                            pack_forbidden_phrases=all_forbidden,
                            is_out_of_scope=retrieval.is_out_of_scope
                        )
                        if val_retry.passed:
                            answer = retry_text
                            generated_by = "llm"
                            model_used = model_name

        # 6. Fallback if LLM unavailable or failed validation
        if not answer:
            is_socratic_req = bool(
                intent == "socratic" or
                "socratic" in q_lower or
                (classification and classification.get("predicted_category") == "E_Socratic_Conversations")
            )
            answer = self.fallback_tutor.generate_response(
                question,
                retrieval,
                server_telemetry,
                conversation_history,
                is_socratic=is_socratic_req
            )
            generated_by = "fallback"
            model_used = None

        # Final validation pass
        val_final = self.validator.validate(
            answer=answer,
            telemetry=server_telemetry,
            pack_forbidden_phrases=all_forbidden,
            is_out_of_scope=retrieval.is_out_of_scope
        )

        return {
            "answer": answer,
            "verified": val_final.passed,
            "based_on_simulation": based_on_simulation,
            "topic_id": topic_id,
            "generated_by": generated_by,
            "model": model_used,
            "sources": retrieval.sources,
            "validation": {
                "passed": val_final.passed,
                "checks": val_final.checks
            },
            "quiz_state": quiz_state,
            "classification": classification
        }


# Singleton service
_tutor_service: Optional[AITutorService] = None


def get_tutor_service() -> AITutorService:
    global _tutor_service
    if _tutor_service is None:
        _tutor_service = AITutorService()
    return _tutor_service
