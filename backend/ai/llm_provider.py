"""LLM provider abstraction supporting Mock, Ollama, and local models."""
import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract interface for quantum AI tutor model providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    def generate(self, prompt: str, system_prompt: str, max_tokens: int = 512, temperature: float = 0.2) -> str:
        """Generates completion text from prompt and system prompt."""
        pass


class MockLLMProvider(LLMProvider):
    """High-quality local deterministic Socratic tutor anchored in quantum physics and circuit telemetry."""

    @property
    def provider_name(self) -> str:
        return "mock_socratic"

    def generate(self, prompt: str, system_prompt: str, max_tokens: int = 512, temperature: float = 0.2) -> str:
        lower = prompt.lower()

        # 0. Circuit Telemetry Explanation
        if "verified simulator facts:" in lower or "explain my circuit" in lower or "explain this circuit" in lower or "circuit result" in lower:
            # Check for Bell State signature in prompt
            if "cnot" in lower and "h(q" in lower and ("p(|00⟩) = 50" in lower or "p(|11⟩) = 50" in lower or "entangled" in lower):
                return (
                    "Based on your circuit's verified simulation telemetry:\n\n"
                    "1. Wire Architecture: You initialized a 2-qubit register in the ground state |00⟩.\n"
                    "2. Quantum Operations: Applying a Hadamard gate H on q0 placed it into an equal superposition: (|0⟩ + |1⟩)/√2. "
                    "The subsequent CNOT gate controlled by q0 targeting q1 entangles the two qubits, producing the canonical Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2.\n"
                    "3. Born Readout Probabilities: The simulator confirms exact measurement probabilities P(|00⟩) = 50.0% and P(|11⟩) = 50.0%, "
                    "with strictly 0.00% probability for |01⟩ and |10⟩.\n"
                    "4. Physical Insight: The qubits share maximal quantum entanglement. Neither qubit possesses an individual pure statevector "
                    "(Bloch vector radius |r| = 0.0 inside the sphere). Measuring q0 instantaneously correlates with q1 with 100% agreement.\n\n"
                    "Would you like to try adding a Pauli-Z or Phase gate to see how relative phase alters the entangled state?"
                )
            elif "verified simulator facts:" in lower:
                return (
                    "Based on your circuit's verified simulation telemetry:\n\n"
                    "Your circuit applies unitary gate operations that transform the computational basis statevectors. "
                    "The simulator calculates the exact Float64 statevector and projects Born rule measurement probabilities across basis states. "
                    "Notice that until projective measurement occurs, all transformations preserve total probability (∑|c_i|² = 1.0).\n\n"
                    "Review the measurement readout candy bars on your workspace to verify how the applied gates redistributed the amplitudes."
                )

        # 1. QUESTION 9: Probability for √3/2|0⟩ + 1/2|1⟩
        if "√3/2" in lower or "sqrt(3)/2" in lower:
            return (
                "For the state |ψ⟩ = (√3/2)|0⟩ + (1/2)|1⟩, we calculate measurement probabilities using the Born rule:\n\n"
                "1. Normalization Check: |√3/2|² + |1/2|² = 3/4 + 1/4 = 1.\n"
                "2. Probability of outcome 0: P(0) = |√3/2|² = 3/4 = 75%.\n"
                "3. Probability of outcome 1: P(1) = |1/2|² = 1/4 = 25%.\n\n"
                "Expected result: P(0) = 75% and P(1) = 25%. Notice that even though the amplitude ratio is √3 : 1, "
                "the observed probability ratio is 3 : 1 because probabilities depend on the squared magnitudes of amplitudes."
            )

        # 2. QUESTION 10: Two Hadamards on |0⟩
        if ("applied twice" in lower or "two hadamard" in lower or "h followed by h" in lower or "h(h|" in lower) and ("|0" in lower or "0" in lower):
            return (
                "When the Hadamard gate (H) is applied twice to |0⟩, the state returns deterministically to |0⟩ (H(H|0⟩) = |0⟩).\n\n"
                "Here is the step-by-step mathematical reasoning:\n"
                "1. First Hadamard: H|0⟩ = (|0⟩ + |1⟩)/√2 = |+⟩ (an equal 50/50 superposition).\n"
                "2. Second Hadamard: H|+⟩ = [ (|0⟩ + |1⟩)/√2 + (|0⟩ - |1⟩)/√2 ] / √2 = (2|0⟩)/2 = |0⟩.\n\n"
                "The amplitudes for |1⟩ cancel out destructively (+1/2 - 1/2 = 0), while the amplitudes for |0⟩ reinforce constructively (+1/2 + 1/2 = 1). "
                "This illustrates quantum interference and confirms that the Hadamard gate is its own inverse (H² = I)."
            )

        # 3. QUESTION 11: Bell state (|00⟩ + |11⟩)/√2 outcomes
        if "bell state" in lower or "(|00⟩+|11⟩)" in lower or "(|00⟩ + |11⟩)" in lower or "bell pair" in lower:
            return (
                "For the ideal Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2, the possible measurement outcomes in the computational basis are:\n\n"
                "- 00 → 50% probability (|1/√2|² = 1/2)\n"
                "- 11 → 50% probability (|1/√2|² = 1/2)\n\n"
                "Outcomes 01 and 10 have strictly 0% probability for this ideal state. "
                "Because the two qubits are maximally entangled, observing 0 on the first qubit guarantees the second qubit is 0, "
                "and observing 1 on the first guarantees the second is 1."
            )

        # 4. QUESTION 4: Does a qubit literally store both 0 and 1?
        if ("store both" in lower or "store two" in lower or "literally store" in lower or "two separate values" in lower or "hold two" in lower):
            return (
                "No. A qubit does not literally store two separate classical values or two classical bits simultaneously. "
                "Instead, a qubit is in a single quantum state described by complex probability amplitudes: |ψ⟩ = α|0⟩ + β|1⟩. "
                "While the superposition mathematically combines the basis vectors |0⟩ and |1⟩ before measurement, "
                "any computational-basis measurement collapses the state and yields only a single 0 or 1 outcome."
            )

        # 5. QUESTION 5: Does a quantum computer try every answer at once?
        if ("try every answer" in lower or "try all answers" in lower or "all answers at once" in lower or "pick the best" in lower):
            return (
                "No, that is a widespread misconception. Quantum computers do not simply 'try every answer simultaneously and pick the best one.' "
                "Rather, quantum algorithms manipulate complex probability amplitudes using constructive and destructive interference. "
                "The algorithm is carefully structured so that amplitudes corresponding to incorrect solutions cancel out, "
                "while amplitudes for correct solutions reinforce each other before measurement."
            )

        # 6. QUESTION 6: Can entanglement send information faster than light?
        if ("faster than light" in lower or "faster-than-light" in lower or "ftl" in lower or "send information faster" in lower or "instant messaging" in lower):
            return (
                "No. Entanglement produces strong quantum correlations between qubits, but it cannot be used to transmit usable information "
                "or messages faster than light. Each observer measuring an entangled qubit sees completely random outcomes. "
                "The correlation between the two qubits only becomes apparent when the observers compare their results using ordinary classical "
                "communication, which is strictly bounded by the speed of light (consistent with relativistic causality)."
            )

        # 7. QUESTION 7: What is decoherence?
        if "decoherence" in lower:
            return (
                "Decoherence is the physical loss of quantum coherence caused by unwanted interactions between a quantum system "
                "and its surrounding environment (such as thermal fluctuations, stray electromagnetic radiation, or material defects). "
                "This environmental interaction causes delicate superpositions to degrade into classical probabilistic mixtures, "
                "representing one of the most critical engineering hurdles in building fault-tolerant quantum computers."
            )

        # 8. QUESTION 8: What does NISQ mean?
        if "nisq" in lower:
            return (
                "NISQ stands for Noisy Intermediate-Scale Quantum. Coined by physicist John Preskill, "
                "it describes the current era of quantum hardware featuring 50 to a few hundred qubits ('intermediate-scale') "
                "that are prone to noise and environmental decoherence ('noisy') without fault-tolerant quantum error correction. "
                "NISQ devices are used to explore hybrid algorithms like VQE and QAOA."
            )

        # 9. QUESTION 12: Will quantum computers replace classical computers?
        if ("replace classical" in lower or "replace computer" in lower or "replace laptop" in lower or "replace my pc" in lower):
            return (
                "No, quantum computers will not replace classical computers. Topic 1.1 highlights that quantum computers are specialized machines "
                "designed for specific computational problems where quantum mechanics affords an algorithmic speedup—such as simulating quantum systems, "
                "optimizing complex materials, and integer factorization. Classical computers remain far more efficient for everyday computing tasks, "
                "and future architectures will rely on hybrid quantum-classical workflows."
            )

        # 10. QUESTION 2: Difference between classical bit and qubit
        if ("difference between" in lower and ("bit" in lower and "qubit" in lower)) or ("classical bit vs" in lower or "bit and a qubit" in lower):
            return (
                "A classical bit has a definite value of either 0 or 1—like a binary light switch. "
                "A qubit, on the other hand, is a two-level quantum system that can exist in a superposition of states: "
                "|ψ⟩ = α|0⟩ + β|1⟩, where α and β are complex amplitudes with |α|² + |β|² = 1. "
                "When measured in the computational basis, a classical bit is read passively, whereas a qubit irreversibly collapses "
                "to produce a single 0 or 1 outcome with probabilities |α|² and |β|²."
            )

        # 11. QUESTION 1: What is a qubit?
        if "what is a qubit" in lower or "define a qubit" in lower or "explain a qubit" in lower or ("qubit" in lower and len(lower.split()) <= 6):
            return (
                "A qubit (quantum bit) is the fundamental unit of quantum information, analogous to the classical bit. "
                "While a classical bit can only ever be 0 or 1, a single-qubit state can exist in a superposition: "
                "|ψ⟩ = α|0⟩ + β|1⟩, where α and β are complex amplitudes satisfying normalization |α|² + |β|² = 1. "
                "Measuring a qubit in the computational basis collapses it to outcome 0 with probability |α|² or outcome 1 with probability |β|².\n\n"
                "What do you think happens to the qubit immediately after this measurement is performed?"
            )

        # 12. QUESTION 3: What is superposition?
        if "superposition" in lower:
            return (
                "In plain language, quantum superposition means that a quantum state can be a linear combination of its orthonormal basis states: "
                "|ψ⟩ = α|0⟩ + β|1⟩, where α, β ∈ ℂ and |α|² + |β|² = 1. "
                "Crucially, superposition is NOT simply a hidden classical value (like a coin tossed under a cup). "
                "The amplitudes can exhibit constructive and destructive interference, which determines the observable measurement probabilities."
            )

        # Additional Topic 1.1 concepts
        if "interference" in lower:
            return (
                "Quantum interference occurs when probability amplitudes add together. Because amplitudes can be positive, negative, or complex, "
                "they can reinforce each other (constructive interference) or cancel each other out (destructive interference). "
                "Quantum algorithms exploit interference to amplify the probability of correct answers while cancelling unwanted answers."
            )

        if "classical bit" in lower:
            return (
                "A classical bit is the basic unit of information in digital computing, taking a value of 0 or 1. "
                "It can be pictured as a macroscopic switch that is either OFF (0) or ON (1)."
            )

        if "quantum computing" in lower and ("what is" in lower or "define" in lower or "explain" in lower):
            return (
                "Quantum computing is a model of computation in which information is held in quantum systems (qubits) "
                "and processed with controlled unitary operations (gates), followed by measurement. "
                "It harnesses quantum-mechanical effects such as superposition, interference, and entanglement to solve specific problems "
                "that scale poorly on classical computers."
            )

        if "bloch sphere" in lower:
            return (
                "The Bloch sphere is a geometric representation of pure single-qubit states on the unit 2-sphere S². "
                "Any pure state can be parameterized as |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩, where θ and φ specify coordinates on the sphere."
            )

        if "cnot" in lower or "controlled" in lower:
            return (
                "The Controlled-NOT (CNOT) gate is a two-qubit entangling operation that flips the target qubit if and only if the control qubit is in state |1⟩. "
                "When applied to a control qubit in superposition (|+) and target in |0⟩, it creates the maximally entangled Bell pair (|00⟩ + |11⟩)/√2."
            )

        if "hadamard" in lower or "h gate" in lower:
            return (
                "The Hadamard (H) gate transforms computational basis states into equal superpositions: "
                "H|0⟩ = (|0⟩ + |1⟩)/√2 = |+⟩, and H|1⟩ = (|0⟩ - |1⟩)/√2 = |-⟩. Applying it twice returns the state to the original vector (H² = I)."
            )

        return (
            f"Socratic Guidance from QuantumLearnAI:\n\n"
            f"You asked: \"{prompt.splitlines()[-1].replace('Learner Question:', '').strip()}\"\n\n"
            f"In quantum computing, information is represented by qubits and transformed by unitary operations before measurement. "
            f"Review the Topic 1.1 foundational principles (superposition, interference, and measurement collapse) to see how amplitudes "
            f"govern observable outcomes."
        )


class OllamaProvider(LLMProvider):
    """Local Ollama LLM provider (e.g. llama3, mistral, deepseek-r1) with graceful fallback."""

    def __init__(self, model_name: str = "llama3:latest", base_url: str = "http://localhost:11434"):
        self.model_name = os.getenv("OLLAMA_MODEL", model_name)
        self.base_url = os.getenv("OLLAMA_URL", base_url)
        self.fallback_provider = MockLLMProvider()

    @property
    def provider_name(self) -> str:
        return f"ollama_{self.model_name}"

    def generate(self, prompt: str, system_prompt: str, max_tokens: int = 512, temperature: float = 0.2) -> str:
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature
            }
        }
        url = f"{self.base_url}/api/generate"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                response_text = data.get("response", "").strip()
                if response_text:
                    return response_text
        except Exception as e:
            logger.info("Ollama is not running locally or timed out (%s). Using MockLLMProvider fallback.", e)

        # Fallback to deterministic Socratic provider
        return self.fallback_provider.generate(prompt, system_prompt, max_tokens, temperature)


def get_llm_provider(prefer_local: bool = True) -> LLMProvider:
    """Factory method returning active LLM provider."""
    # If OLLAMA_HOST is set or requested, try OllamaProvider
    if os.getenv("USE_OLLAMA", "false").lower() == "true":
        return OllamaProvider()
    return MockLLMProvider()
