"""AI package for grounded educational tutoring."""
from backend.ai.prompts import SYSTEM_PROMPT, build_tutor_prompt, GLOBAL_FORBIDDEN_RULES
from backend.ai.validator import ResponseValidator, ValidationResult
from backend.ai.fallback import DeterministicFallbackTutor
from backend.ai.tutor import AITutorService, get_tutor_service

__all__ = [
    "SYSTEM_PROMPT",
    "build_tutor_prompt",
    "GLOBAL_FORBIDDEN_RULES",
    "ResponseValidator",
    "ValidationResult",
    "DeterministicFallbackTutor",
    "AITutorService",
    "get_tutor_service"
]
