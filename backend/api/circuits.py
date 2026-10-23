"""Circuits and Simulation API endpoints."""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException

from backend.models.circuit import SimulateRequest, ExportRequest
from backend.quantum.simulator import simulate_circuit
from backend.quantum.export import export_to_qiskit

router = APIRouter(prefix="/circuits", tags=["Circuits & Simulation"])


@router.post("/simulate", response_model=Dict[str, Any])
async def simulate(request: SimulateRequest):
    """Execute quantum circuit simulation and return verified telemetry."""
    try:
        circuit_dict = request.circuit.model_dump()
        telemetry = simulate_circuit(
            circuit=circuit_dict,
            shots=request.shots,
            seed=request.seed
        )
        return telemetry
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulator encountered an error: {str(e)}"
        )


@router.post("/export", response_model=Dict[str, str])
async def export_circuit(request: ExportRequest):
    """Export quantum circuit into equivalent runnable Qiskit Python code."""
    try:
        circuit_dict = request.circuit.model_dump()
        qiskit_code = export_to_qiskit(circuit_dict)
        return {"code": qiskit_code, "language": "python"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate export: {str(e)}"
        )
