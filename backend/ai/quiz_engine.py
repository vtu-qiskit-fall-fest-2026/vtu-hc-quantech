"""Quiz Engine for QuantumLearnAI.

Handles:
- Explicit quiz commands ('quiz me', 'test me', 'ask me a question', etc.)
- Strict topic continuity and explicit topic switching ('quiz me on superposition')
- Structured state tracking across questions (questionNumber, totalQuestions, score, options, correctAnswer, awaitingAnswer)
- Grounded question retrieval from topic packs and dynamic concept question generation
- Grounded answer evaluation and step-by-step feedback
"""
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from backend.knowledge.registry import TopicRegistry, get_topic_registry
from backend.knowledge.schema import AssessmentQuestion, TopicPack

logger = logging.getLogger("QuizEngine")


class DynamicQuizQuestionModel(BaseModel):
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str


class QuizEngine:
    """Deterministic, curriculum-grounded quiz manager."""

    def __init__(self, registry: Optional[TopicRegistry] = None):
        self.registry = registry or get_topic_registry()

    def resolve_topic_for_query(self, query: str, current_topic_id: str) -> str:
        """Resolve topic ID from query dynamically across loaded packs, or preserve current_topic_id."""
        q_lower = query.lower()

        # Check if the student explicitly asked to switch to another topic/concept
        explicit_match = re.search(r'(?:quiz me on|test me on|question on|quiz on|short quiz on|quiz in|about)\s+([a-zA-Z0-9_\-\s]+)', q_lower)
        target_subject = explicit_match.group(1).strip() if explicit_match else None

        if target_subject and target_subject not in ["this", "this concept", "this topic", "it"]:
            target_norm = target_subject.replace("versus", "vs")
            subj_words = set(re.findall(r"\w+", target_norm)) - {"on", "a", "an", "the", "in", "short", "quiz", "give", "me"}
            scores = {}
            for t_id in self.registry.loaded_topic_ids:
                pack = self.registry.get_topic(t_id)
                if not pack:
                    continue
                score = 0
                title_lower = pack.manifest.title.lower()
                if target_norm in title_lower or target_subject in title_lower:
                    score += 20
                title_words = set(re.findall(r"\w+", title_lower))
                overlap = len(subj_words & title_words)
                if overlap >= 2:
                    score += overlap * 6
                if target_subject in pack.manifest.summary.lower() or target_norm in pack.manifest.summary.lower():
                    score += 8
                objectives = getattr(pack.manifest, 'learning_objectives', None) or (pack.manifest.model_extra.get('learning_objectives') if pack.manifest.model_extra else [])
                for obj in (objectives or []):
                    if target_subject in str(obj).lower() or target_norm in str(obj).lower():
                        score += 6
                for c in pack.concepts_file.concepts:
                    if target_subject == c.title.lower() or target_norm == c.title.lower():
                        score += 10
                    elif target_subject in c.title.lower() or target_norm in c.title.lower():
                        score += 5
                scores[t_id] = score

            if scores:
                best_tid, best_score = max(scores.items(), key=lambda x: x[1])
                if best_score > 0:
                    return best_tid

        # Preserve the current topic being viewed
        return current_topic_id or (self.registry.loaded_topic_ids[0] if self.registry.loaded_topic_ids else "")

    def _get_topic_questions(self, topic_pack: TopicPack) -> List[AssessmentQuestion]:
        """Extract and prepare verified assessment questions from topic pack."""
        questions: List[AssessmentQuestion] = []
        
        # 1. From assessments file
        if topic_pack.assessments_file.assessments:
            questions.extend(topic_pack.assessments_file.assessments)
        if topic_pack.assessments_file.quick_understanding_checks:
            for q in topic_pack.assessments_file.quick_understanding_checks:
                if q.id not in [existing.id for existing in questions]:
                    questions.append(q)

        return questions

    def extract_answer_choice(self, user_input: str, options: Optional[List[str]] = None) -> Optional[int]:
        """Extract choice index (0-3 for A-D) from user text."""
        raw = user_input.strip().lower()

        # Check explicit letters
        if raw in ["a", "option a", "choice a", "1"]:
            return 0
        if raw in ["b", "option b", "choice b", "2"]:
            return 1
        if raw in ["c", "option c", "choice c", "3"]:
            return 2
        if raw in ["d", "option d", "choice d", "4"]:
            return 3

        # Match phrases like "the answer is B", "I think B", "it's B", "B is correct"
        letter_match = re.search(r"\b([a-d])\b", raw)
        if letter_match and len(raw) <= 25:
            letter = letter_match.group(1).upper()
            return ord(letter) - 65

        # Check option text substring matches
        if options:
            for idx, opt in enumerate(options):
                opt_clean = opt.strip().lower()
                if opt_clean in raw or (len(raw) > 3 and raw in opt_clean):
                    return idx

        return None

    def _generate_dynamic_llm_question(
        self,
        topic_pack: TopicPack,
        concept_id: Optional[str],
        llm_provider: Any
    ) -> Optional[Dict[str, Any]]:
        """Ask configured LLM to generate a structured multiple-choice quiz question grounded in curriculum."""
        provider_name = getattr(llm_provider, 'provider_name', None) or getattr(llm_provider, 'name', None) or type(llm_provider).__name__.lower().replace('provider', '')
        llm_called = False
        llm_response_received = False
        structured_parse_success = False
        validation_success = False
        fallback_reason = "none"

        if not llm_provider:
            fallback_reason = "no_llm_provider"
            logger.info(
                f"[QUIZ]\n"
                f"provider=none\n"
                f"topic_id={topic_pack.manifest.id}\n"
                f"concept_id={concept_id}\n"
                f"llm_called=false\n"
                f"llm_response_received=false\n"
                f"structured_parse_success=false\n"
                f"validation_success=false\n"
                f"fallback_reason={fallback_reason}"
            )
            return None

        target_concept = None
        if concept_id:
            target_concept = next((c for c in topic_pack.concepts_file.concepts if c.id == concept_id), None)
        if not target_concept and topic_pack.concepts_file.concepts:
            target_concept = topic_pack.concepts_file.concepts[0]

        concept_title = target_concept.title if target_concept else topic_pack.manifest.title
        concept_simple = target_concept.simple_explanation if target_concept else topic_pack.manifest.summary
        concept_math = getattr(target_concept, 'mathematical_representation', '') if target_concept else ''

        prompt = (
            f"You are a quantum computing curriculum quiz generator.\n"
            f"Create a multiple choice quiz question about:\n"
            f"Topic: {topic_pack.manifest.title}\n"
            f"Concept: {concept_title}\n"
            f"Explanation Context: {concept_simple}\n"
            f"Mathematical Representation: {concept_math}\n\n"
            f"REQUIREMENTS:\n"
            f"1. Formulate 1 clear conceptual or mathematical question.\n"
            f"2. Provide EXACTLY 4 distinct options in the 'options' list. Do NOT provide more or less than 4 options.\n"
            f"3. Randomize the position of the correct answer (do not always make A or B correct).\n"
            f"4. Provide a concise explanation (1-2 sentences) for why the chosen option is correct.\n"
            f"5. Do NOT use quantum myths ('tries every answer at once', 'faster than light', etc.).\n"
            f"6. Return ONLY a single raw JSON object with this exact schema:\n"
            f"{{\n"
            f'  "question": "question text",\n'
            f'  "options": ["opt0", "opt1", "opt2", "opt3"],\n'
            f'  "correct_option_index": 0,\n'
            f'  "explanation": "explanation text"\n'
            f"}}"
        )

        try:
            llm_called = True
            raw_res = llm_provider.generate(
                prompt=prompt,
                system_prompt="You are a strict JSON quiz generator. You only output valid JSON without markdown.",
                temperature=0.2,
                max_tokens=700
            )
            if not raw_res:
                fallback_reason = "empty_llm_response"
            else:
                llm_response_received = True
                cleaned = raw_res.strip()
                if "```" in cleaned:
                    cleaned = re.sub(r"```(?:json)?\s*", "", cleaned)
                    cleaned = cleaned.replace("```", "").strip()

                json_match = re.search(r'(\{[\s\S]*\})', cleaned)
                if json_match:
                    cleaned = json_match.group(1)

                try:
                    data = json.loads(cleaned)
                except json.JSONDecodeError:
                    # Attempt simple repair for trailing commas or missing closing brace
                    repaired = re.sub(r',\s*([\]\}])', r'\1', cleaned)
                    if not repaired.endswith("}"):
                        if '"' in repaired and repaired.count('"') % 2 != 0:
                            repaired += '"'
                        repaired += "\n}"
                    data = json.loads(repaired)

                structured_parse_success = True

                opts = data.get("options")
                corr_idx = data.get("correct_option_index")

                if isinstance(corr_idx, str):
                    if corr_idx.isdigit():
                        corr_idx = int(corr_idx)
                    elif corr_idx.upper() in ["A", "B", "C", "D"]:
                        corr_idx = ord(corr_idx.upper()) - 65

                # Robust sanitizer: Ensure exactly 4 options
                if isinstance(opts, list) and len(opts) >= 4:
                    if isinstance(corr_idx, int) and 0 <= corr_idx < len(opts):
                        if corr_idx < 4:
                            opts = [str(o) for o in opts[:4]]
                        else:
                            opts = [str(o) for o in opts[:3]] + [str(opts[corr_idx])]
                            corr_idx = 3
                    else:
                        opts = [str(o) for o in opts[:4]]
                        corr_idx = 0
                elif isinstance(opts, list):
                    opts = [str(o) for o in opts]

                data["options"] = opts
                data["correct_option_index"] = corr_idx

                validated = DynamicQuizQuestionModel(**data)
                if len(validated.options) == 4 and 0 <= validated.correct_option_index < 4:
                    validation_success = True
                    fallback_reason = "none"
                    logger.info(
                        f"[QUIZ]\n"
                        f"provider={provider_name}\n"
                        f"topic_id={topic_pack.manifest.id}\n"
                        f"concept_id={target_concept.id if target_concept else None}\n"
                        f"llm_called={llm_called}\n"
                        f"llm_response_received={llm_response_received}\n"
                        f"structured_parse_success={structured_parse_success}\n"
                        f"validation_success={validation_success}\n"
                        f"fallback_reason={fallback_reason}"
                    )
                    return {
                        "question": validated.question,
                        "options": validated.options,
                        "correct_option_index": validated.correct_option_index,
                        "explanation": validated.explanation,
                        "concept_id": target_concept.id if target_concept else None
                    }
                else:
                    fallback_reason = f"options_length_{len(validated.options)}_or_index_{validated.correct_option_index}"
        except Exception as e:
            fallback_reason = f"{type(e).__name__}: {str(e)}"

        logger.info(
            f"[QUIZ]\n"
            f"provider={provider_name}\n"
            f"topic_id={topic_pack.manifest.id}\n"
            f"concept_id={target_concept.id if target_concept else None}\n"
            f"llm_called={llm_called}\n"
            f"llm_response_received={llm_response_received}\n"
            f"structured_parse_success={structured_parse_success}\n"
            f"validation_success={validation_success}\n"
            f"fallback_reason={fallback_reason}"
        )
        return None

    def start_quiz(
        self,
        topic_id: str,
        concept_id: Optional[str] = None,
        llm_provider: Optional[Any] = None,
        total_questions: int = 5
    ) -> Tuple[str, Optional[Dict[str, Any]], List[Dict[str, str]], str]:
        """Start a new quiz session for topic_id, generating via LLM when available or falling back to pack."""
        topic_pack = self.registry.get_topic(topic_id)
        if not topic_pack:
            return (
                "Topic content unavailable for quiz generation.",
                None,
                [],
                "fallback"
            )

        questions = self._get_topic_questions(topic_pack)
        if not questions and not llm_provider:
            return (
                f"No quiz questions available for topic {topic_id}.",
                None,
                [],
                "fallback"
            )

        total_q = min(total_questions, len(questions)) if questions else 3
        gen_source = "curriculum_pack"
        chosen_q = None

        if llm_provider:
            dynamic = self._generate_dynamic_llm_question(topic_pack, concept_id, llm_provider)
            if dynamic:
                chosen_q = dynamic
                gen_source = "llm"

        if not chosen_q:
            first_q = questions[0] if questions else None
            if not first_q:
                return ("Quiz content unavailable.", None, [], "fallback")
            chosen_q = {
                "id": first_q.id,
                "question": first_q.question,
                "options": first_q.options,
                "correct_option_index": first_q.correct_option_index,
                "explanation": first_q.explanation,
                "concept_id": getattr(first_q, 'concept_id', None)
            }
            q_id = first_q.id
        else:
            q_id = f"llm_{topic_id}_{chosen_q.get('concept_id', 'dynamic')}"
        
        quiz_state = {
            "mode": "quiz",
            "topicId": topic_id,
            "topicTitle": topic_pack.manifest.title,
            "questionNumber": 1,
            "totalQuestions": total_q,
            "score": 0,
            "totalAnswered": 0,
            "currentQuestion": chosen_q["question"],
            "options": chosen_q["options"],
            "correctOptionIndex": chosen_q["correct_option_index"],
            "correctLetter": chr(65 + chosen_q["correct_option_index"]),
            "explanation": chosen_q["explanation"],
            "conceptId": chosen_q.get("concept_id"),
            "awaitingAnswer": True,
            "usedQuestionIds": [q_id],
            "generatedBy": gen_source
        }

        opts_formatted = []
        for i, opt in enumerate(chosen_q["options"]):
            opts_formatted.append(f"{chr(65+i)}. {opt}")
        opts_str = "\n".join(opts_formatted)

        answer_text = (
            f"### Question 1 of {total_q}\n\n"
            f"**{chosen_q['question']}**\n\n"
            f"{opts_str}\n\n"
            f"*Your answer? (Type or select A, B, C, or D)*"
        )

        sources = [{"type": "assessment", "id": q_id, "topic_id": topic_id}]
        return answer_text, quiz_state, sources, gen_source

    def evaluate_answer(
        self,
        user_input: str,
        quiz_state: Dict[str, Any]
    ) -> Tuple[str, Optional[Dict[str, Any]], List[Dict[str, str]]]:
        """Evaluate student answer against active quiz_state and progress to next question."""
        topic_id = quiz_state.get("topicId") or (self.registry.loaded_topic_ids[0] if self.registry.loaded_topic_ids else "")
        topic_pack = self.registry.get_topic(topic_id)
        
        current_options = quiz_state.get("options", [])
        correct_idx = quiz_state.get("correctOptionIndex", 0)
        correct_letter = quiz_state.get("correctLetter") or chr(65 + correct_idx)
        correct_text = current_options[correct_idx] if 0 <= correct_idx < len(current_options) else ""
        explanation = quiz_state.get("explanation", "")

        selected_idx = self.extract_answer_choice(user_input, current_options)

        if selected_idx is None:
            # Clarify choice without advancing question
            opts_formatted = [f"{chr(65+i)}. {opt}" for i, opt in enumerate(current_options)]
            opts_str = "\n".join(opts_formatted)
            msg = (
                f"Please select your choice letter (A, B, C, or D) for Question {quiz_state.get('questionNumber', 1)}:\n\n"
                f"**{quiz_state.get('currentQuestion')}**\n\n"
                f"{opts_str}"
            )
            return msg, quiz_state, [{"type": "assessment", "id": "answer_clarification", "topic_id": topic_id}]

        is_correct = (selected_idx == correct_idx)
        current_score = quiz_state.get("score", 0) + (1 if is_correct else 0)
        total_answered = quiz_state.get("totalAnswered", 0) + 1
        total_q = quiz_state.get("totalQuestions", 5)

        feedback_header = "### ✓ Correct!" if is_correct else "### ❌ Not Quite"
        feedback_body = (
            f"**Option {correct_letter} ({correct_text}) is the correct answer.**\n\n"
            f"**Explanation:** {explanation}"
        )

        sources = [{"type": "assessment", "id": f"q_{total_answered}", "topic_id": topic_id}]

        evaluation = {
            "isCorrect": is_correct,
            "selectedOption": chr(65 + selected_idx) if selected_idx is not None else None,
            "questionId": quiz_state.get("usedQuestionIds", ["q"])[-1],
            "conceptId": quiz_state.get("conceptId"),
            "topicId": topic_id
        }

        # Check if quiz completed
        if total_answered >= total_q:
            pct = round((current_score / total_q) * 100, 1)
            final_text = (
                f"{feedback_header}\n\n"
                f"{feedback_body}\n\n"
                f"---\n\n"
                f"### 🎉 Quiz Complete!\n"
                f"**Final Score: {current_score}/{total_q} ({pct}%)**\n\n"
                f"*Type 'quiz me' to try another quiz or ask any question to continue learning!*"
            )
            completion_state = {
                "mode": "completed",
                "evaluation": evaluation,
                "score": current_score,
                "totalAnswered": total_answered,
                "totalQuestions": total_q,
                "topicId": topic_id
            }
            return final_text, completion_state, sources

        # Fetch next question
        questions = self._get_topic_questions(topic_pack) if topic_pack else []
        used_ids = quiz_state.get("usedQuestionIds", [])
        next_q = None

        for q in questions:
            if q.id not in used_ids:
                next_q = q
                break

        if not next_q and questions:
            next_q = questions[total_answered % len(questions)]

        if not next_q:
            final_text = (
                f"{feedback_header}\n\n"
                f"{feedback_body}\n\n"
                f"---\n\n"
                f"**Final Score: {current_score}/{total_q}**"
            )
            completion_state = {
                "mode": "completed",
                "evaluation": evaluation,
                "score": current_score,
                "totalAnswered": total_answered,
                "totalQuestions": total_q,
                "topicId": topic_id
            }
            return final_text, completion_state, sources

        next_q_num = total_answered + 1
        next_opts_formatted = [f"{chr(65+i)}. {opt}" for i, opt in enumerate(next_q.options)]
        next_opts_str = "\n".join(next_opts_formatted)

        next_quiz_state = {
            "mode": "quiz",
            "topicId": topic_id,
            "topicTitle": quiz_state.get("topicTitle", ""),
            "questionNumber": next_q_num,
            "totalQuestions": total_q,
            "score": current_score,
            "totalAnswered": total_answered,
            "currentQuestion": next_q.question,
            "options": next_q.options,
            "correctOptionIndex": next_q.correct_option_index,
            "correctLetter": chr(65 + next_q.correct_option_index),
            "explanation": next_q.explanation,
            "conceptId": getattr(next_q, 'concept_id', None),
            "awaitingAnswer": True,
            "usedQuestionIds": used_ids + [next_q.id],
            "evaluation": evaluation
        }

        full_response = (
            f"{feedback_header}\n\n"
            f"{feedback_body}\n\n"
            f"**Score: {current_score}/{total_answered}**\n\n"
            f"---\n\n"
            f"### Question {next_q_num} of {total_q}\n\n"
            f"**{next_q.question}**\n\n"
            f"{next_opts_str}\n\n"
            f"*Your answer?*"
        )

        return full_response, next_quiz_state, sources
