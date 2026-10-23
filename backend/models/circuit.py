"""Pydantic models for circuits and simulation."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class CircuitOperation(BaseModel):
    gate: str
    qubits: List[int]


class CircuitModel(BaseModel):
    num_qubits: int = Field(default=2, ge=1, le=6)
    operations: List[CircuitOperation] = Field(default_factory=list)


class SimulateRequest(BaseModel):
    circuit: CircuitModel
    shots: Optional[int] = Field(default=None, ge=1, le=100000)
    seed: Optional[int] = None


class ExportRequest(BaseModel):
    circuit: CircuitModel
