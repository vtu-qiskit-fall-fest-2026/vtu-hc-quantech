"""AI Tutor service orchestrating intent detection, grounding, verification, and expert routing."""
import time
import uuid
from typing import List, Optional, Dict
from datetime import datetime, timezone

from backend.models.tutor import TutorRequest, TutorResponse, ExpertQueueItem, AnswerExpertRequest
from backend.ai.llm_provider import get_llm_provider, LLMProvider
from backend.ai.prompt_manager import PromptManager
from backend.ai.response_validator import ResponseValidator
from backend.knowledge_base.loader import KnowledgeBase


class TutorService:
    """Manages AI tutor responses, simulation grounding, and expert escalation."""

    def __init__(self):
        self.llm_provider: LLMProvider = get_llm_provider()
        self.kb = KnowledgeBase.get_instance()
        # In-memory expert queue store (can be connected to a DB or file)
        self.expert_queue: Dict[str, ExpertQueueItem] = {}

    def ask(self, req: TutorRequest) -> TutorResponse:
        """Processes a learner question through the full grounded Socratic pipeline."""
        start_time = time.perf_counter()
        concept = self.kb.get_concept(req.concept_id) if req.concept_id else None
        concept_title = concept.title if concept else None

        # 1. Intent Detection / Routing Check
        query_lower = req.query.lower()
        is_expert_request = any(k in query_lower for k in ("ask expert", "human expert", "escalate", "instructor help"))

        # 2. Extract Ground Truth Facts from Simulator (if circuit simulated)
        facts = PromptManager.extract_simulation_facts(req.simulation_result, req.circuit)

        # 3. Misconception Intent Detection & Retrieval
        all_misc = self.kb.get_all_misconceptions()
        alerts: List[str] = []
        misconception_keywords = {
            "try every answer": ("M01", "Quantum computers do not simply try every answer at once; they use amplitude interference to amplify correct outcomes and cancel wrong ones."),
            "every answer at once": ("M01", "Quantum computers do not simply try every answer at once; they use amplitude interference."),
            "all answers at once": ("M01", "Quantum computers do not try every answer at once; they use quantum interference."),
            "pick the best": ("M01", "Algorithms do not simply search all paths simultaneously and pick the best; measurement only yields one outcome."),
            "store both": ("M02", "A qubit does not literally store two separate classical values; it has probability amplitudes collapsing upon measurement."),
            "store two": ("M02", "A qubit does not store two classical bits; it holds a superposition of states collapsing to a single outcome."),
            "literally store": ("M02", "A qubit does not store multiple classical values simultaneously."),
            "faster than light": ("M03", "Entanglement cannot transmit information faster than light; observing correlations requires classical communication."),
            "faster-than-light": ("M03", "Entanglement does not enable faster-than-light communication."),
            "ftl": ("M03", "Entanglement cannot transmit usable data faster than light."),
            "replace classical": ("M04", "Quantum computers are specialized devices that complement, rather than replace, classical computers."),
            "replace computer": ("M04", "Quantum computers are specialized accelerators and will not replace general-purpose classical computers."),
            "replace laptop": ("M04", "Quantum computers will not replace laptops or classical workstations."),
            "faster at everything": ("M05", "Quantum speedups are problem-specific, not universally faster for every calculation."),
            "exponentially faster at everything": ("M05", "Quantum computers are not universally faster at all tasks."),
            "probabilistic bit": ("M06", "A qubit is fundamentally distinct from a probabilistic bit because amplitudes can exhibit interference and phases."),
            "coin in flight": ("M06", "Superposition is not a hidden classical state like a spinning coin."),
            "not affect it": ("M07", "Projective measurement is active and irreversible, collapsing the state into an eigenstate."),
            "software bug": ("M08", "Decoherence is a physical environmental noise effect, not a software bug.")
        }

        for phrase, (mid, note) in misconception_keywords.items():
            if phrase in query_lower:
                alerts.append(f"Misconception Alert ({mid}): {note}")

        # Also check existing concept-specific misconceptions
        concept_miscs = self.kb.get_misconceptions(req.concept_id) if req.concept_id else []
        for m in concept_miscs:
            if m.false_belief.lower() in query_lower:
                alert_str = f"Misconception Alert: {m.false_belief} -> Fact: {m.refutation}"
                if alert_str not in alerts:
                    alerts.append(alert_str)

        # 4. If query explicitly demands human expert, queue it immediately
        if is_expert_request:
            item_id = str(uuid.uuid4())[:8]
            item = ExpertQueueItem(
                id=item_id,
                query=req.query,
                concept_id=req.concept_id,
                user_id=req.user_id or "anonymous_learner",
                timestamp=datetime.now(timezone.utc).isoformat(),
                status="pending"
            )
            self.expert_queue[item_id] = item
            return TutorResponse(
                answer=(
                    f"Your question has been escalated to our human quantum computing instructors (Ticket #{item_id}). "
                    f"Once reviewed, the verified answer will appear in your curriculum knowledge base."
                ),
                concept_id=req.concept_id,
                grounded_facts=facts,
                misconception_alerts=alerts,
                confidence=1.0,
                is_fallback=False,
                provider=self.llm_provider.provider_name,
                route_to_expert=True
            )

        # 5. Knowledge Retrieval: Relevant Topic 1.1 Context, Examples & Ground Truth
        topic_context_parts = []
        topic_info = self.kb.get_topic("1.1")
        if topic_info:
            for c in topic_info.concepts:
                c_words = c.title.lower().split()
                if any(w in query_lower for w in c_words if len(w) > 3) or (c.id.lower() in query_lower):
                    topic_context_parts.append(f"- Concept {c.id} ({c.title}): {c.definition} {c.explanation or ''}")
                    if c.mathematics:
                        topic_context_parts.append(f"  Math: {', '.join(c.mathematics)}")

        topic_context = "\n".join(topic_context_parts) if topic_context_parts else None

        # Retrieve relevant worked examples
        examples = self.kb.get_examples("1.1")
        example_strings: List[str] = []
        for ex in examples:
            ex_title_lower = ex.title.lower()
            ex_q_lower = ex.question.lower()
            if any(term in query_lower for term in ("√3/2", "probability", "bell state", "applied twice", "two hadamard", "complex amplitude")):
                if ("√3/2" in query_lower and "√3/2" in ex.question) or \
                   ("applied twice" in query_lower and "twice" in ex_q_lower) or \
                   ("bell" in query_lower and "bell" in ex_title_lower) or \
                   ("complex" in query_lower and "complex" in ex_title_lower):
                    example_strings.append(f"{ex.title}: Question: {ex.question} Steps: {' -> '.join(ex.steps)} Answer: {ex.answer}")

        # Retrieve relevant ground truth rules
        gt_rules = self.kb.get_ground_truth("1.1")
        gt_facts: List[str] = []
        for rule in gt_rules:
            if "√3/2" in query_lower and "√3/2" in rule.input:
                gt_facts.append(f"Ground Truth for {rule.input}: P(0)=75%, P(1)=25%")
            elif "twice" in query_lower and "H(H" in rule.input:
                gt_facts.append(f"Ground Truth for {rule.input}: Output is strictly |0⟩")
            elif "bell" in query_lower and "CNOT" in rule.input:
                gt_facts.append("Ground Truth for Bell State: P(00)=50%, P(11)=50%, P(01)=0%, P(10)=0%")

        # 6. Build Socratic Grounded Prompt
        system_prompt = PromptManager.build_system_prompt()
        user_prompt = PromptManager.build_user_prompt(
            query=req.query,
            concept_title=concept_title or (topic_info.topic_name if topic_info else None),
            topic_context=topic_context,
            misconception_alerts=alerts,
            worked_examples=example_strings,
            ground_truth_facts=gt_facts,
            simulation_facts=facts
        )

        # 7. LLM Generation
        raw_response = self.llm_provider.generate(user_prompt, system_prompt)

        # 8. Response Validation against Simulator Telemetry & Ground Truth
        validated_text, confidence, sim_discrepancies = ResponseValidator.validate_response(
            raw_response, req.simulation_result, gt_rules, req.query
        )
        alerts.extend(sim_discrepancies)

        # 9. Auto-escalate to expert queue if confidence is low (< 0.70)
        route_to_expert = confidence < 0.70
        if route_to_expert:
            item_id = str(uuid.uuid4())[:8]
            self.expert_queue[item_id] = ExpertQueueItem(
                id=item_id,
                query=req.query,
                concept_id=req.concept_id,
                user_id=req.user_id or "learner",
                timestamp=datetime.now(timezone.utc).isoformat(),
                status="pending"
            )

        return TutorResponse(
            answer=validated_text,
            concept_id=req.concept_id or "1.1",
            grounded_facts=facts,
            misconception_alerts=alerts,
            confidence=confidence,
            is_fallback=self.llm_provider.provider_name == "mock_socratic",
            provider=self.llm_provider.provider_name,
            route_to_expert=route_to_expert
        )

    def get_expert_queue(self, status: Optional[str] = None) -> List[ExpertQueueItem]:
        items = list(self.expert_queue.values())
        if status:
            items = [it for it in items if it.status.lower() == status.lower()]
        return sorted(items, key=lambda x: x.timestamp, reverse=True)

    def answer_expert_item(self, req: AnswerExpertRequest) -> Optional[ExpertQueueItem]:
        item = self.expert_queue.get(req.item_id)
        if not item:
            return None

        item.answer = req.answer
        item.expert_name = req.expert_name
        item.status = "answered"
        item.answered_at = datetime.now(timezone.utc).isoformat()

        # Update lesson reviewer if associated with a concept
        if item.concept_id:
            lesson = self.kb.get_lesson(item.concept_id)
            if lesson and lesson.verification and lesson.verification.expert_review:
                lesson.verification.expert_review.reviewed_by = req.expert_name
                lesson.verification.expert_review.reviewed_at = item.answered_at

        return item
