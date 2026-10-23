"""Base interface for all LLM providers."""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List


class LLMProvider(ABC):
    """Abstract base class establishing provider contract for AI tutoring."""

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Check provider status and availability.
        
        Returns:
            {
                "available": bool,
                "provider": str,
                "model": Optional[str],
                "error": Optional[str]
            }
        """
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.1,
        max_tokens: int = 500
    ) -> Optional[str]:
        """Generate curriculum-grounded explanation or quiz response from the LLM.
        
        Returns:
            The raw string response, or None if generation failed.
        """
        pass
