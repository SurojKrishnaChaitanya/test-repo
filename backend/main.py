"""
INDRA-AI High-Resolution Severe Weather Nowcasting Engine
FastAPI Production Entrypoint for Render Cloud Deployment
Model Architecture: Earthformer-ConvLSTM-DGMR-DualTask
Inference Engine: TensorRT-LLM-Triton-V2.4
Spatial Resolution: 3km_EPSG4326_LCC
"""

import sys
import os
import time

# Ensure both workspace root and backend directory are in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)

if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

# Ensure 'backend' package resolution works when running inside the backend folder
if "backend" not in sys.modules:
    import types
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [_current_dir]
    backend_pkg.__file__ = os.path.join(_current_dir, "__init__.py")
    sys.modules["backend"] = backend_pkg

from backend.core.compat import (
    FastAPI,
    Request,
    CORSMiddleware,
    BaseHTTPMiddleware,
    JSONResponse,
)

from backend.core.config import settings
from backend.routers import inference, simulation, telemetry, advisory, alerts

app = FastAPI(
    title=getattr(settings, "PROJECT_NAME", "INDRA-AI High-Resolution Severe Weather Nowcasting Engine"),
    version=getattr(settings, "VERSION", "2.4.0"),
    description="Operational dual-task deep learning nowcasting engine for severe thunderstorms, cloudbursts, and flash floods across India.",
    docs_url="/docs",
    redoc_url="/redoc",
)


class EnterpriseHeadersMiddleware(BaseHTTPMiddleware):
    """
    Mandatory production middleware injecting enterprise architecture headers
    and execution latency metadata across all HTTP responses.
    """

    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            process_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            response = JSONResponse(
                {"status": "error", "detail": str(exc)},
                status_code=500,
            )
        process_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # Inject production enterprise headers safely across all paths
        headers_to_inject = {
            "x-model-architecture": getattr(settings, "MODEL_ARCHITECTURE", "Earthformer-ConvLSTM-DGMR-DualTask"),
            "x-inference-engine": getattr(settings, "INFERENCE_ENGINE", "TensorRT-LLM-Triton-V2.4"),
            "x-spatial-resolution": getattr(settings, "SPATIAL_RESOLUTION", "3km_EPSG4326_LCC"),
            "x-temporal-window": getattr(settings, "TEMPORAL_WINDOW", "t-6h_to_t+6h_step30m"),
            "x-compute-node": getattr(settings, "COMPUTE_NODE", "hf-dgx-a100-mig-3g.40gb"),
            "x-inference-latency-ms": str(process_time_ms),
        }

        if hasattr(response, "headers"):
            for k, v in headers_to_inject.items():
                response.headers[k] = v

        return response


# Register Enterprise Header Middleware
app.add_middleware(EnterpriseHeadersMiddleware)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, "CORS_ORIGINS", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "x-model-architecture",
        "x-inference-engine",
        "x-spatial-resolution",
        "x-temporal-window",
        "x-compute-node",
        "x-inference-latency-ms",
    ],
)

# Mount Modular Routers under /api/v1
app.include_router(inference.router, prefix=getattr(settings, "API_V1_STR", "/api/v1"))
app.include_router(simulation.router, prefix=getattr(settings, "API_V1_STR", "/api/v1"))
app.include_router(telemetry.router, prefix=getattr(settings, "API_V1_STR", "/api/v1"))
app.include_router(advisory.router, prefix=getattr(settings, "API_V1_STR", "/api/v1"))
app.include_router(alerts.router)  # Handles /alerts and /api/v1/alerts

# Root & Convenience Aliases Matching Frontend Service Client Contracts
@app.post(f"{getattr(settings, 'API_V1_STR', '/api/v1')}/predict", tags=["Inference Engine"])
async def root_predict_alias(payload: inference.PredictRequest):
    """Direct alias for frontend mlInferenceService.predictSevereWeather."""
    return await inference.execute_model_inference(payload)


@app.post(f"{getattr(settings, 'API_V1_STR', '/api/v1')}/simulate", tags=["What-If Convective Engine"])
async def root_simulate_alias(payload: simulation.SimulationScenarioRequest):
    """Direct alias for convective What-If scenario simulations."""
    return await simulation.execute_convective_simulation(payload)


@app.post(f"{getattr(settings, 'API_V1_STR', '/api/v1')}/advisory", tags=["Multilingual RAG Advisories"])
async def root_advisory_alias(payload: advisory.AdvisoryGenerationRequest):
    """Direct alias for frontend ragAdvisoryService.generateAdvisory."""
    return await advisory.generate_multilingual_advisory(payload)


@app.get("/healthz", tags=["Health Probe"])
async def health_check_probe():
    """Operational health check probe for Render orchestration and load balancers."""
    return {
        "status": "healthy",
        "service": getattr(settings, "PROJECT_NAME", "INDRA-AI High-Resolution Severe Weather Nowcasting Engine"),
        "model_architecture": getattr(settings, "MODEL_ARCHITECTURE", "Earthformer-ConvLSTM-DGMR-DualTask"),
        "inference_engine": getattr(settings, "INFERENCE_ENGINE", "TensorRT-LLM-Triton-V2.4"),
        "compute_node": getattr(settings, "COMPUTE_NODE", "hf-dgx-a100-mig-3g.40gb"),
    }
