"""Simulation models for QuantumLearnAI."""
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from backend.models.circuit import CircuitModel


class ComplexAmplitude(BaseModel):
    """Represents a complex amplitude in the statevector representation."""
    re: float = Field(..., description="Real part")
    im: float = Field(..., description="Imaginary part")


class BlochCoordinate(BaseModel):
    """Cartesian (x, y, z) and spherical (theta, phi) Bloch sphere coordinates for a qubit."""
    qubit: int
    x: float
    y: float
    z: float
    theta: float
    phi: float


class SimulationResult(BaseModel):
    """Standardized simulation result across all simulation backends."""
    status: str = Field(default="success", description="'success' or 'error'")
    backend: str = Field(default="numpy_statevector", description="Backend identifier (e.g. 'numpy_statevector', 'qiskit_aer')")
    qubits: int = Field(default=1, description="Number of qubits in circuit")
    statevector: List[ComplexAmplitude] = Field(default_factory=list, description="Full statevector complex amplitudes")
    probabilities: Dict[str, float] = Field(default_factory=dict, description="Basis state measurement probabilities (e.g., {'00': 0.5, '11': 0.5})")
    measurement_counts: Dict[str, int] = Field(default_factory=dict, description="Simulated measurement outcomes from shots")
    bloch_coordinates: List[BlochCoordinate] = Field(default_factory=list, description="Bloch vectors for each individual qubit")
    execution_time_ms: float = Field(default=0.0, description="Simulation execution latency in ms")
    error_message: Optional[str] = Field(default=None, description="Detailed error trace if simulation failed")


class SimulationRequest(BaseModel):
    """Request payload to simulate a circuit."""
    circuit: CircuitModel
    shots: int = Field(default=1024, ge=1, le=65536)
    backend: str = Field(default="numpy_statevector")
