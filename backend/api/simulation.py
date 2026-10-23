"""Quantum simulation API router for QuantumLearnAI."""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.models.circuit import CircuitModel, CodeExecutionRequest
from backend.models.simulation import SimulationResult, SimulationRequest
from backend.services.simulation_service import SimulationService

router = APIRouter(prefix="/simulation", tags=["Simulation"])
simulation_service = SimulationService()


@router.get("/backends", response_model=List[str])
async def get_backends():
    """Lists available quantum simulation backends."""
    return simulation_service.get_available_backends()


@router.post("/run", response_model=SimulationResult)
async def run_simulation(req: SimulationRequest):
    """Executes a structured circuit and returns standardized simulation results."""
    return simulation_service.simulate(
        circuit=req.circuit,
        shots=req.shots,
        backend_name=req.backend
    )


@router.post("/execute-code", response_model=SimulationResult)
async def execute_code(req: CodeExecutionRequest):
    """Parses and simulates framework-specific quantum program code."""
    return simulation_service.parse_and_simulate_code(req)
