"""Factory for resolving and instantiating configured LLM Provider."""
import os
import logging
from typing import Optional, Dict, Any

from backend.ai.providers.base import LLMProvider
from backend.ai.providers.ollama import OllamaProvider
from backend.ai.providers.gemini import GeminiProvider
from backend.ai.providers.openai import OpenAIProvider

logger = logging.getLogger(__name__)

_PROVIDER_CACHE: Dict[str, LLMProvider] = {}


def get_llm_provider(name: Optional[str] = None) -> LLMProvider:
    """Resolve and return active LLM Provider with graceful fallbacks.
    
    Resolution order if name is not explicitly passed:
    1. os.getenv("LLM_PROVIDER") ('ollama', 'gemini', 'openai')
    2. Check Ollama local instance
    3. Check Gemini (if GEMINI_API_KEY present)
    4. Check OpenAI (if OPENAI_API_KEY present)
    5. Default to OllamaProvider (will honestly report unavailable if not running)
    """
    configured_name = (name or os.getenv("LLM_PROVIDER") or "").lower().strip()

    if configured_name in ["none", "fallback", "offline"]:
        class OfflineProvider(LLMProvider):
            def get_status(self) -> Dict[str, Any]:
                return {"available": False, "provider": "offline", "model": None, "error": "Offline mode active"}
            def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
                return {"content": "", "model": "offline", "provider": "offline", "success": False, "error": "Offline mode active"}
        return OfflineProvider()

    if configured_name == "gemini":
        if "gemini" not in _PROVIDER_CACHE:
            _PROVIDER_CACHE["gemini"] = GeminiProvider()
        return _PROVIDER_CACHE["gemini"]

    if configured_name == "openai":
        if "openai" not in _PROVIDER_CACHE:
            _PROVIDER_CACHE["openai"] = OpenAIProvider()
        return _PROVIDER_CACHE["openai"]

    if configured_name == "ollama":
        if "ollama" not in _PROVIDER_CACHE:
            _PROVIDER_CACHE["ollama"] = OllamaProvider()
        return _PROVIDER_CACHE["ollama"]

    # Auto-detection mode:
    # 1. First probe Ollama (local private default)
    ollama_provider = _PROVIDER_CACHE.get("ollama") or OllamaProvider()
    _PROVIDER_CACHE["ollama"] = ollama_provider
    ollama_status = ollama_provider.get_status()
    if ollama_status.get("available"):
        return ollama_provider

    # 2. Check Gemini
    if os.getenv("GEMINI_API_KEY"):
        gemini_provider = _PROVIDER_CACHE.get("gemini") or GeminiProvider()
        _PROVIDER_CACHE["gemini"] = gemini_provider
        return gemini_provider

    # 3. Check OpenAI
    if os.getenv("OPENAI_API_KEY"):
        openai_provider = _PROVIDER_CACHE.get("openai") or OpenAIProvider()
        _PROVIDER_CACHE["openai"] = openai_provider
        return openai_provider

    # 4. Return Ollama provider (available=False)
    return ollama_provider
