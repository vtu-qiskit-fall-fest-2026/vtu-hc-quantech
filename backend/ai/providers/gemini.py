"""Google Gemini LLM Provider Implementation."""
import os
import time
import logging
from typing import Dict, Any, Optional, List
import httpx

from backend.ai.providers.base import LLMProvider

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


class GeminiProvider(LLMProvider):
    """Integrates Google Gemini via REST API."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or DEFAULT_GEMINI_MODEL
        self._cached_status: Optional[Dict[str, Any]] = None
        self._cache_timestamp: float = 0.0

    def get_status(self) -> Dict[str, Any]:
        """Check if Gemini API key is configured."""
        now = time.time()
        if self._cached_status and (now - self._cache_timestamp) < 10.0:
            return self._cached_status

        key = self.api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            status = {
                "available": False,
                "provider": "gemini",
                "model": self.model,
                "error": "GEMINI_API_KEY environment variable not set"
            }
        else:
            status = {
                "available": True,
                "provider": "gemini",
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
        """Generate response via Gemini REST generateContent endpoint."""
        key = self.api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={key}"

        contents = []
        if conversation_history:
            for turn in conversation_history[-4:]:
                role = "model" if turn.get("role") == "assistant" else "user"
                contents.append({
                    "role": role,
                    "parts": [{"text": turn.get("content", "")}]
                })

        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }

        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text")
                else:
                    logger.error(f"Gemini API returned HTTP {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Gemini API call error: {e}")

        return None
