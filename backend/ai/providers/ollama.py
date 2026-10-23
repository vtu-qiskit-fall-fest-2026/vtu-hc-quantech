"""Ollama Local LLM Provider Implementation."""
import os
import time
import logging
from typing import Dict, Any, Optional, List
import httpx

from backend.ai.providers.base import LLMProvider

logger = logging.getLogger(__name__)

DEFAULT_OLLAMA_URL = os.getenv("OLLAMA_URL", os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")).rstrip("/")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")


class OllamaProvider(LLMProvider):
    """Integrates locally running Ollama instance."""

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or DEFAULT_OLLAMA_URL).rstrip("/")
        self.preferred_model = model or DEFAULT_MODEL
        self._cached_status: Optional[Dict[str, Any]] = None
        self._cache_timestamp: float = 0.0
        self._cooldown_until: float = 0.0

    def get_status(self) -> Dict[str, Any]:
        """Check Ollama availability via /api/tags."""
        now = time.time()
        if now < self._cooldown_until:
            return {
                "available": False,
                "provider": "ollama",
                "model": None,
                "error": f"In cooldown until {self._cooldown_until - now:.1f}s"
            }

        if self._cached_status and (now - self._cache_timestamp) < 5.0:
            return self._cached_status

        status = {
            "available": False,
            "provider": "ollama",
            "model": None,
            "error": None
        }

        try:
            with httpx.Client(timeout=2.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    if models:
                        matched = self.preferred_model if self.preferred_model in models else models[0]
                        status["available"] = True
                        status["model"] = matched
                    else:
                        status["error"] = "Ollama connected but no models downloaded"
                else:
                    status["error"] = f"Ollama HTTP {res.status_code}"
        except Exception as e:
            status["error"] = f"Ollama unreachable: {str(e)}"
            self._cooldown_until = now + 4.0

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
        """Generate response via Ollama /api/chat or /api/generate."""
        status = self.get_status()
        if not status["available"]:
            return None

        model = status["model"]
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if conversation_history:
            for turn in conversation_history[-4:]:
                role = turn.get("role", "user")
                if role in ["user", "assistant"]:
                    messages.append({"role": role, "content": turn.get("content", "")})

        messages.append({"role": "user", "content": prompt})

        # Try /api/chat first
        try:
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": 0.9,
                    "num_predict": max_tokens
                }
            }
            with httpx.Client(timeout=120.0) as client:
                res = client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    msg = data.get("message", {})
                    if isinstance(msg, dict) and "content" in msg:
                        return msg["content"]
                    return data.get("response")

                # Fallback to /api/generate
                gen_payload = {
                    "model": model,
                    "prompt": prompt,
                    "system": system_prompt or "",
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "top_p": 0.9,
                        "num_predict": max_tokens
                    }
                }
                res2 = client.post(f"{self.base_url}/api/generate", json=gen_payload)
                if res2.status_code == 200:
                    return res2.json().get("response")
        except Exception as e:
            logger.warning(f"Ollama generation failed: {e}")
            self._cooldown_until = time.time() + 5.0
            return None

        return None
