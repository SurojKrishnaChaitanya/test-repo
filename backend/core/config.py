"""
INDRA-AI Production Configuration Engine
Calibrated for operational 3x3 km spatial nowcasting across Indian convective domains.
"""

from typing import List
from backend.core.compat import BaseModel


class EngineSettings(BaseModel):
    PROJECT_NAME: str = "INDRA-AI High-Resolution Severe Weather Nowcasting Engine"
    VERSION: str = "2.4.0"
    API_V1_STR: str = "/api/v1"

    # Enterprise Meteorological Tensor Specifications
    MODEL_ARCHITECTURE: str = "Earthformer-ConvLSTM-DGMR-DualTask"
    INFERENCE_ENGINE: str = "TensorRT-LLM-Triton-V2.4"
    SPATIAL_RESOLUTION: str = "3km_EPSG4326_LCC"
    TEMPORAL_WINDOW: str = "t-6h_to_t+6h_step30m"
    COMPUTE_NODE: str = "hf-dgx-a100-mig-3g.40gb"

    # Operational Geographic Domain (Mainland India Bounding Envelope)
    LAT_MIN: float = 6.0
    LAT_MAX: float = 38.0
    LNG_MIN: float = 68.0
    LNG_MAX: float = 98.0
    GRID_RESOLUTION_KM: float = 3.0
    GRID_STEP_DEG: float = 0.5  # High-level regional partition step

    # Operational Latency Simulation Bounds (Replicating Multi-Gigabyte Tensor Pipelines)
    INFERENCE_LATENCY_MIN: float = 1.6
    INFERENCE_LATENCY_MAX: float = 2.8
    TELEMETRY_LATENCY_MIN: float = 0.12
    TELEMETRY_LATENCY_MAX: float = 0.24

    # CORS Allowed Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "https://*.vercel.app",
        "https://*.onrender.com",
        "*",
    ]


settings = EngineSettings()
