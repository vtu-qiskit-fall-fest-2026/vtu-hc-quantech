"""Test suite for Phase 4 (LLM Provider Abstraction)."""
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.ai.providers.base import LLMProvider
from backend.ai.providers.ollama import OllamaProvider
from backend.ai.providers.gemini import GeminiProvider
from backend.ai.providers.openai import OpenAIProvider
from backend.ai.providers.factory import get_llm_provider
from backend.ai.tutor import get_tutor_service

def test_providers():
    print("\n--- TEST 1: Factory resolution for distinct providers ---")
    p_ollama = get_llm_provider("ollama")
    assert isinstance(p_ollama, OllamaProvider), "Expected OllamaProvider"
    print(f"Ollama provider created: {type(p_ollama).__name__}")

    p_gemini = get_llm_provider("gemini")
    assert isinstance(p_gemini, GeminiProvider), "Expected GeminiProvider"
    print(f"Gemini provider created: {type(p_gemini).__name__}")

    p_openai = get_llm_provider("openai")
    assert isinstance(p_openai, OpenAIProvider), "Expected OpenAIProvider"
    print(f"OpenAI provider created: {type(p_openai).__name__}")
    print("✓ TEST 1 PASSED: Factory successfully instantiates distinct providers.")

    print("\n--- TEST 2: Status reporting structure ---")
    st_ollama = p_ollama.get_status()
    print(f"Ollama status: {st_ollama}")
    assert "available" in st_ollama and "provider" in st_ollama and "model" in st_ollama

    st_gemini = p_gemini.get_status()
    print(f"Gemini status: {st_gemini}")
    assert "available" in st_gemini and "provider" in st_gemini

    st_openai = p_openai.get_status()
    print(f"OpenAI status: {st_openai}")
    assert "available" in st_openai and "provider" in st_openai
    print("✓ TEST 2 PASSED: All providers conform to common status reporting contract.")

    print("\n--- TEST 3: Tutor service delegation to provider ---")
    tutor = get_tutor_service()
    status = tutor.check_llm_status()
    print(f"Tutor check_llm_status(): {status}")
    assert status["provider"] in ["ollama", "gemini", "openai", None]
    print("✓ TEST 3 PASSED: Tutor service delegates cleanly to provider abstraction.")

if __name__ == "__main__":
    test_providers()
    print("\n=======================================================")
    print("  ALL PHASE 4 PROVIDER ABSTRACTION TESTS PASSED!")
    print("=======================================================\n")
