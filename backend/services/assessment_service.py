"""Assessment service managing quiz auto-grading and simulator-checked circuit challenges."""
import math
from typing import Dict, List, Optional, Any
from backend.models.circuit import CircuitModel
from backend.models.assessment import (
    QuizSubmission, QuizResult, QuizFeedbackItem,
    Challenge, ChallengeSubmission, ChallengeResult
)
from backend.knowledge_base.loader import KnowledgeBase
from backend.quantum.simulator.numpy_simulator import NumPySimulatorBackend


class AssessmentService:
    """Grades quizzes and verifies circuit challenges through the simulation engine."""

    def __init__(self):
        self.kb = KnowledgeBase.get_instance()
        self.simulator = NumPySimulatorBackend()
        self.challenges: Dict[str, Challenge] = {}
        self._initialize_challenges()

    def _initialize_challenges(self):
        """Extracts challenges from the 30 lessons' try_it_challenge data."""
        for lesson in self.kb.get_all_lessons():
            ch_data = lesson.try_it_challenge
            if ch_data:
                cid = f"challenge_{lesson.concept_id}"
                self.challenges[cid] = Challenge(
                    id=cid,
                    title=f"Challenge: {lesson.title}",
                    difficulty=lesson.difficulty,
                    description=ch_data.get("prompt", ""),
                    prompt=ch_data.get("prompt", ""),
                    qubits=ch_data.get("qubits", 1),
                    allowed_gates=ch_data.get("allowed_gates", ["H", "X", "Y", "Z", "CNOT", "M"]),
                    target_state=ch_data.get("target_state"),
                    target_probabilities=ch_data.get("target_probabilities", {}),
                    solution_circuit=ch_data.get("solution_circuit")
                )

    def grade_quiz(self, submission: QuizSubmission) -> QuizResult:
        """Grades a quiz submission against the verified lesson quiz."""
        lesson = self.kb.get_lesson(submission.concept_id)
        if not lesson or not lesson.quiz:
            return QuizResult(
                concept_id=submission.concept_id,
                total_questions=0,
                correct_count=0,
                score_percentage=0.0,
                passed=False,
                feedback=[]
            )

        feedback_list: List[QuizFeedbackItem] = []
        correct_count = 0
        total_questions = len(lesson.quiz)

        for idx, q in enumerate(lesson.quiz):
            correct_idx = q.get("answer_index", 0)
            user_idx = submission.answers.get(str(idx), -1)
            is_correct = (user_idx == correct_idx)

            if is_correct:
                correct_count += 1
                feedback_list.append(QuizFeedbackItem(
                    question_index=idx,
                    user_answer=user_idx,
                    correct_answer=correct_idx,
                    is_correct=True,
                    explanation=q.get("explanation", "Correct! Excellent understanding."),
                    misconception=None
                ))
            else:
                # Check if chosen distractor matches a registered misconception
                distractors = q.get("misconception_distractors", {})
                misc_id = distractors.get(str(user_idx))
                feedback_list.append(QuizFeedbackItem(
                    question_index=idx,
                    user_answer=user_idx,
                    correct_answer=correct_idx,
                    is_correct=False,
                    explanation=q.get("explanation", "Incorrect."),
                    misconception=misc_id
                ))

        score_pct = (correct_count / total_questions * 100.0) if total_questions > 0 else 0.0
        return QuizResult(
            concept_id=submission.concept_id,
            total_questions=total_questions,
            correct_count=correct_count,
            score_percentage=round(score_pct, 1),
            passed=score_pct >= 70.0,
            feedback=feedback_list
        )

    def get_challenges(self, difficulty: Optional[str] = None) -> List[Challenge]:
        items = list(self.challenges.values())
        if difficulty:
            items = [c for c in items if c.difficulty.lower() == difficulty.lower()]
        return items

    def grade_challenge(self, submission: ChallengeSubmission) -> ChallengeResult:
        """Simulates submitted circuit and evaluates against challenge target."""
        challenge = self.challenges.get(submission.challenge_id)
        if not challenge:
            return ChallengeResult(
                challenge_id=submission.challenge_id,
                passed=False,
                fidelity=0.0,
                measured_probabilities={},
                target_probabilities={},
                feedback=f"Challenge '{submission.challenge_id}' not found."
            )

        # Check allowed gates
        if challenge.allowed_gates:
            allowed_set = set(g.upper() for g in challenge.allowed_gates)
            for op in submission.circuit.operations:
                g = op.gate.upper()
                if g not in allowed_set and g not in ("M", "MEASURE"):
                    return ChallengeResult(
                        challenge_id=submission.challenge_id,
                        passed=False,
                        fidelity=0.0,
                        measured_probabilities={},
                        target_probabilities=challenge.target_probabilities,
                        feedback=f"Gate '{op.gate}' is not allowed in this challenge. Allowed: {challenge.allowed_gates}."
                    )

        # Run circuit on simulator
        sim = self.simulator.run(submission.circuit, shots=1024)
        if sim.status != "success":
            return ChallengeResult(
                challenge_id=submission.challenge_id,
                passed=False,
                fidelity=0.0,
                measured_probabilities={},
                target_probabilities=challenge.target_probabilities,
                feedback=f"Simulation error: {sim.error_message}"
            )

        # Evaluate probability distribution match
        max_error = 0.0
        for state, target_p in challenge.target_probabilities.items():
            actual_p = sim.probabilities.get(state, 0.0)
            err = abs(actual_p - target_p)
            if err > max_error:
                max_error = err

        fidelity = max(0.0, 1.0 - max_error)
        passed = max_error <= 0.05

        hint = None
        if passed:
            feedback = f"Challenge Solved! Quantum state matches target with {round(fidelity*100, 2)}% fidelity."
        else:
            feedback = f"State probability mismatch. Maximum basis error was {round(max_error*100, 1)}%."
            hint = f"Expected outcomes: {challenge.target_probabilities}. Observed: {sim.probabilities}."

        return ChallengeResult(
            challenge_id=submission.challenge_id,
            passed=passed,
            fidelity=round(fidelity, 4),
            measured_probabilities=sim.probabilities,
            target_probabilities=challenge.target_probabilities,
            feedback=feedback,
            hint=hint
        )
