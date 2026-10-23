"""Main FastAPI application for QuantumLearnAI backend."""
import sys
import logging
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.topics import router as topics_router
from backend.api.circuits import router as circuits_router
from backend.api.tutor import router as tutor_router
from backend.api.assessment import router as assessment_router
from backend.knowledge.registry import get_topic_registry
from backend.ai.tutor import get_tutor_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("QuantumLearnAI")

app = FastAPI(
    title="QuantumLearnAI API",
    description="Topic-agnostic, simulator-grounded educational quantum platform backend.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS middleware for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(topics_router, prefix="/api")
app.include_router(circuits_router, prefix="/api")
app.include_router(tutor_router, prefix="/api")
app.include_router(assessment_router, prefix="/api")


@app.get("/api/health", tags=["Health"])
async def health_check():
    """System health check reporting Ollama connectivity and loaded topic counts."""
    registry = get_topic_registry()
    tutor_service = get_tutor_service()
    ollama_status = tutor_service.check_ollama_status()
    
    try:
        import qiskit_aer
        qiskit_aer_available = True
    except (ImportError, Exception):
        qiskit_aer_available = False

    return {
        "status": "healthy",
        "service": "QuantumLearnAI Backend",
        "version": "2.0.0",
        "simulator_engine": "numpy_statevector",
        "loaded_topics": len(registry.loaded_topic_ids),
        "topic_ids": registry.loaded_topic_ids,
        "ollama_connected": ollama_status["available"],
        "active_llm_model": ollama_status["model"],
        "classifier_loaded": tutor_service.classifier.is_available if tutor_service.classifier else False,
        "fallback_tutor_ready": True,
        "qiskit_aer_available": qiskit_aer_available
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
