"""OpenAI-compatible LLM Provider Implementation."""
import os
import time
import logging
from typing import Dict, Any, Optional, List
import httpx

from backend.ai.providers.base import LLMProvider

logger = logging.getLogger(__name__)

DEFAULT_OPENAI_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class OpenAIProvider(LLMProvider):
    """Integrates OpenAI-compatible chat completions API."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = (base_url or DEFAULT_OPENAI_URL).rstrip("/")
        self.model = model or DEFAULT_OPENAI_MODEL
        self._cached_status: Optional[Dict[str, Any]] = None
        self._cache_timestamp: float = 0.0

    def get_status(self) -> Dict[str, Any]:
        """Check if OpenAI API key is configured."""
        now = time.time()
        if self._cached_status and (now - self._cache_timestamp) < 10.0:
            return self._cached_status

        key = self.api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            status = {
                "available": False,
                "provider": "openai",
                "model": self.model,
                "error": "OPENAI_API_KEY environment variable not set"
            }
        else:
            status = {
                "available": True,
                "provider": "openai",
                "model": self.model,
                "error": None
            }

        self._cached_status = status
        self._cache_timestamp = now
        return status

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.1,
        max_tokens: int = 500
    ) -> Optional[str]:
        """Generate response via /chat/completions."""
        key = self.api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            return None

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if conversation_history:
            for turn in conversation_history[-4:]:
                role = turn.get("role", "user")
                if role in ["user", "assistant"]:
                    messages.append({"role": role, "content": turn.get("content", "")})

        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content")
                else:
                    logger.error(f"OpenAI API returned HTTP {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"OpenAI API call error: {e}")

        return None
