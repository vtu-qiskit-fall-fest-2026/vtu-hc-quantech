"""Adaptive path recommendation service based on EWMA mastery and concept DAG."""
from typing import Dict, List, Optional
from backend.models.analytics import ProgressUpdateRequest, UserMasteryProfile, Recommendation, PlatformOverview
from backend.knowledge_base.loader import KnowledgeBase

ALPHA = 0.35  # EWMA smoothing factor
MASTERY_THRESHOLD = 0.70  # Mastery needed to satisfy prerequisite


class RecommendationService:
    """Computes personalized learning paths and concept recommendations."""

    def __init__(self):
        self.kb = KnowledgeBase.get_instance()
        # In-memory store for user profiles: user_id -> UserMasteryProfile
        self.user_profiles: Dict[str, UserMasteryProfile] = {}

    def get_or_create_profile(self, user_id: str) -> UserMasteryProfile:
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = UserMasteryProfile(
                user_id=user_id,
                mastery={},
                completed_concepts=[],
                total_time_seconds=0
            )
        return self.user_profiles[user_id]

    def update_progress(self, req: ProgressUpdateRequest) -> UserMasteryProfile:
        profile = self.get_or_create_profile(req.user_id)
        current_mastery = profile.mastery.get(req.concept_id, 0.0)

        # Exponentially Weighted Moving Average update
        new_mastery = (ALPHA * req.score) + ((1.0 - ALPHA) * current_mastery)
        profile.mastery[req.concept_id] = round(new_mastery, 4)

        if req.completed and req.concept_id not in profile.completed_concepts:
            profile.completed_concepts.append(req.concept_id)

        profile.total_time_seconds += req.time_spent_seconds

        # Update mastery level
        num_completed = len(profile.completed_concepts)
        if num_completed >= 20:
            profile.level = "Advanced Quantum Engineer"
        elif num_completed >= 10:
            profile.level = "Intermediate Practitioner"
        elif num_completed >= 3:
            profile.level = "Rising Apprentice"
        else:
            profile.level = "Foundations Beginner"

        return profile

    def recommend_next_concept(self, user_id: str) -> Recommendation:
        profile = self.get_or_create_profile(user_id)
        all_concepts = self.kb.get_all_concepts()

        # Sort concepts by tier then order
        sorted_concepts = sorted(all_concepts, key=lambda c: (c.tier, c.id))

        candidate = None
        why_explanation = ""
        readiness = 1.0
        prereqs_completed = []
        prereqs_missing = []

        for concept in sorted_concepts:
            # Check if concept is already mastered
            cid = concept.id
            mastery = profile.mastery.get(cid, 0.0)
            if mastery >= MASTERY_THRESHOLD and cid in profile.completed_concepts:
                continue

            # Check prerequisites
            met = True
            comp = []
            missing = []
            for prereq_id in concept.prerequisites:
                p_mastery = profile.mastery.get(prereq_id, 0.0)
                if p_mastery >= MASTERY_THRESHOLD:
                    comp.append(prereq_id)
                else:
                    met = False
                    missing.append(prereq_id)

            if met:
                candidate = concept
                prereqs_completed = comp
                prereqs_missing = missing
                readiness = 1.0

                if len(comp) > 0:
                    prereq_names = [self.kb.get_concept(p).title for p in comp if self.kb.get_concept(p)]
                    why_explanation = (
                        f"Recommended because you have mastered the foundational prerequisites ({', '.join(prereq_names)}). "
                        f"'{concept.title}' builds directly on your validated knowledge at Tier {concept.tier}."
                    )
                else:
                    why_explanation = (
                        f"Recommended entry point: '{concept.title}' provides core foundational concepts without prerequisites."
                    )
                break

        # If all unlocked concepts completed or none available, recommend first unfinished
        if not candidate:
            for concept in sorted_concepts:
                if concept.id not in profile.completed_concepts:
                    candidate = concept
                    why_explanation = f"Continue mastering '{concept.title}' to progress through Tier {concept.tier}."
                    break

        # Fallback to first concept
        if not candidate and len(sorted_concepts) > 0:
            candidate = sorted_concepts[0]
            why_explanation = "You have completed all curriculum topics! Review foundational concepts."

        return Recommendation(
            recommended_concept_id=candidate.id,
            concept_title=candidate.title,
            tier=candidate.tier,
            tier_name=candidate.tier_name,
            difficulty=candidate.difficulty,
            why_this_next=why_explanation,
            readiness_score=readiness,
            prerequisites_completed=prereqs_completed,
            prerequisites_missing=prereqs_missing
        )

    def get_platform_overview(self) -> PlatformOverview:
        ver_rep = self.kb.get_verification_report()
        total_concepts = len(self.kb.get_all_concepts())
        total_lessons = len(self.kb.get_all_lessons())
        verified = ver_rep.get("passed", 30)

        return PlatformOverview(
            total_concepts=total_concepts,
            total_lessons=total_lessons,
            verified_lessons=verified,
            verification_rate_percent=round((verified / total_lessons * 100) if total_lessons > 0 else 100.0, 1),
            simulator_backends=["numpy_statevector", "qiskit_aer_ready"],
            active_learners=max(1, len(self.user_profiles)),
            pending_expert_reviews=0
        )
