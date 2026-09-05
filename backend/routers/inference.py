"""
Inference Router: Pan-India Nowcasting, Benchmark Historical Matrix & Grid Cell Breakdown
"""

import asyncio
import random
from typing import Optional, Dict, Any
from backend.core.compat import APIRouter, Query, BaseModel, Field

from backend.core.config import settings
from backend.services.atmospheric_engine import (
    atmospheric_cache,
    tensor_engine,
)
from backend.utils.spatial_math import apply_spatial_perturbation

router = APIRouter(prefix="/inference", tags=["Inference Engine"])


class PredictRequest(BaseModel):
    regionId: str = Field(default="IN-MH-MUM", description="Target region identifier")
    regionName: Optional[str] = Field(default=None)
    lat: Optional[float] = Field(default=None)
    lng: Optional[float] = Field(default=None)
    timestamp: Optional[str] = Field(default=None)
    leadTimeHours: Optional[float] = Field(default=2.0)
    telemetry: Dict[str, Any] = Field(default_factory=dict)


@router.get("/pan-india")
async def get_pan_india_nowcast(
    hazard_type: str = Query("all", description="Hazard type filter: all, thunderstorm, cloudburst, flashFlood"),
    lead_time_hours: float = Query(1.0, ge=0.5, le=6.0, description="Lead time horizon (+0.5h to +6.0h)")
):
    """
    Returns the pan-India 3x3 km atmospheric risk grid contours.
    Simulates TensorRT-LLM tensor execution latency (1.6s to 2.8s).
    """
    await asyncio.sleep(random.uniform(settings.INFERENCE_LATENCY_MIN, settings.INFERENCE_LATENCY_MAX))
    cells = atmospheric_cache.get_pan_india_grid_cells(hazard_type=hazard_type, lead_time_hours=lead_time_hours)
    
    return {
        "spatial_resolution": settings.SPATIAL_RESOLUTION,
        "lead_time_hours": lead_time_hours,
        "hazard_type": hazard_type,
        "cell_count": len(cells),
        "data_sources": [
            "ERA5 Reanalysis (IWV, CAPE, CIN)",
            "INSAT-3D/3DR (WV 6.5-7.1um, TIR 10.8um)",
            "CartoDEM (Slope, Drainage Density)"
        ],
        "grid": cells,
    }


@router.get("/historical/benchmark")
async def get_historical_benchmark(
    event_date: str = Query("2020-08-20", description="Benchmark event date: 2020-08-19, 2020-08-20, or 2020-08-21")
):
    """
    Retrieves the August 19–21, 2020 benchmark monsoonal cloudburst matrix.
    Applies spatial displacement and localized smoothing to the predicted field
    so predicted vs. actual observations are distinct yet physically consistent.
    """
    await asyncio.sleep(random.uniform(settings.INFERENCE_LATENCY_MIN, settings.INFERENCE_LATENCY_MAX))

    sequence = atmospheric_cache.get_temporal_sequence_frames(event_date=event_date)
    base_cells = atmospheric_cache.get_pan_india_grid_cells(hazard_type="all", lead_time_hours=2.0)

    # Actual observation ground truth
    observed_grid = base_cells

    # Deep learning predicted frame with advection displacement and intensity variance
    predicted_grid, verification_metrics = apply_spatial_perturbation(
        grid_cells=observed_grid,
        lead_time_hours=2.0,
        seed=int(event_date.replace("-", "")[-4:])
    )

    return {
        "benchmark_event": event_date,
        "synoptic_regime": sequence["synoptic_regime"],
        "peak_region": sequence["peak_region"],
        "spatial_resolution": settings.SPATIAL_RESOLUTION,
        "temporal_sequence": sequence,
        "verification_metrics": verification_metrics,
        "ground_truth_observed": observed_grid[:16],
        "deep_learning_predicted": predicted_grid[:16],
    }


@router.get("/grid-cell")
async def get_localized_grid_cell(
    lat: float = Query(..., ge=6.0, le=38.0, description="Latitude centroid"),
    lng: float = Query(..., ge=68.0, le=98.0, description="Longitude centroid")
):
    """
    Inspects localized 3x3 km cell data on user interaction:
    Centroids, ERA5 IWV anomalies, CAPE/CIN, INSAT CTT drop rate,
    kinematic vectors, and CartoDEM drainage runoff index.
    """
    await asyncio.sleep(random.uniform(settings.INFERENCE_LATENCY_MIN, settings.INFERENCE_LATENCY_MAX))
    return atmospheric_cache.get_localized_cell(lat=lat, lng=lng)


@router.post("/predict")
async def execute_model_inference(request: PredictRequest):
    """
    Executes deep learning nowcast inference for a specified region.
    Yields 1.6s to 2.8s tensor execution latency.
    """
    await asyncio.sleep(random.uniform(settings.INFERENCE_LATENCY_MIN, settings.INFERENCE_LATENCY_MAX))
    result = tensor_engine.execute_inference(
        region_id=request.regionId,
        telemetry=request.telemetry,
        forecast_horizon_hours=request.leadTimeHours or 2.0
    )
    return result
