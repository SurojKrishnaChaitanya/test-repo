"""
Simulation Router: What-If Convective Scenario Modifier Engine
Modulates boundary-layer Delta T, Delta IWV, and Soil Saturation to recalculate risks.
"""

import asyncio
import random
from typing import Optional, List, Dict, Any
from backend.core.compat import APIRouter, BaseModel, Field

from backend.core.config import settings
from backend.services.atmospheric_engine import (
    atmospheric_cache,
    runoff_kernel,
)

router = APIRouter(prefix="/simulation", tags=["What-If Convective Engine"])


class SimulationScenarioRequest(BaseModel):
    delta_t_celsius: float = Field(
        default=1.5,
        ge=-2.0,
        le=4.0,
        description="Boundary layer temperature perturbation in Celsius (-2.0 to +4.0)"
    )
    delta_iwv_pct: float = Field(
        default=12.0,
        ge=-20.0,
        le=30.0,
        description="Atmospheric column water vapor percentage anomaly (-20% to +30%)"
    )
    soil_saturation: float = Field(
        default=0.85,
        ge=0.1,
        le=1.0,
        description="Soil volumetric moisture content / antecedent saturation (0.1 to 1.0)"
    )
    region_id: Optional[str] = Field(
        default="IN-MH-MUM",
        description="Target regional microclimate identifier"
    )


class ThresholdBreach(BaseModel):
    rule_id: str
    rule_name: str
    severity_tier: str
    threshold_value: str
    simulated_value: str


@router.post("/run")
async def execute_convective_simulation(request: SimulationScenarioRequest):
    """
    Executes what-if sensitivity analysis across convective trigger indices,
    updraft buoyancy, and runoff hydrographs.
    Yields 1.6s to 2.8s tensor simulation execution latency.
    """
    await asyncio.sleep(random.uniform(settings.INFERENCE_LATENCY_MIN, settings.INFERENCE_LATENCY_MAX))

    region = atmospheric_cache.REGIONS.get(
        request.region_id or "IN-MH-MUM",
        atmospheric_cache.REGIONS["IN-MH-MUM"]
    )
    base_telemetry = region["baseline_telemetry"]

    simulated_state = runoff_kernel.simulate_convective_modifiers(
        base_cape=base_telemetry["cape"],
        base_cin=base_telemetry["cin"],
        base_iwv=base_telemetry["iwv"],
        base_rain=base_telemetry["precipitation"],
        delta_t_celsius=request.delta_t_celsius,
        delta_iwv_pct=request.delta_iwv_pct,
        soil_saturation=request.soil_saturation,
        slope_degrees=region["terrain_slope_deg"]
    )

    # Threshold evaluation
    breaches: List[Dict[str, Any]] = []
    if simulated_state["simulated_rain_rate_mm_hr"] >= 75.0:
        breaches.append({
            "rule_id": "cloudburst-critical-intensity",
            "rule_name": "Extreme Cloudburst Precipitation Trigger",
            "severity_tier": "critical",
            "threshold_value": "75.0 mm/hr",
            "simulated_value": f"{simulated_state['simulated_rain_rate_mm_hr']} mm/hr"
        })
    if simulated_state["simulated_iwv_kg_m2"] >= 55.0:
        breaches.append({
            "rule_id": "iwv-atmospheric-river-surge",
            "rule_name": "Atmospheric Moisture Column Saturation",
            "severity_tier": "warning",
            "threshold_value": "55.0 kg/m²",
            "simulated_value": f"{simulated_state['simulated_iwv_kg_m2']} kg/m²"
        })
    if simulated_state["simulated_cape_j_kg"] >= 2500.0:
        breaches.append({
            "rule_id": "extreme-convective-instability",
            "rule_name": "Severe Updraft Buoyancy Exceeded",
            "severity_tier": "critical",
            "threshold_value": "2500.0 J/kg",
            "simulated_value": f"{simulated_state['simulated_cape_j_kg']} J/kg"
        })

    # Updated spatial probability contours around the target zone
    center_lat = region["lat"]
    center_lng = region["lng"]
    spatial_contours = []
    for d_lat in [-0.15, -0.07, 0.0, 0.07, 0.15]:
        for d_lng in [-0.15, -0.07, 0.0, 0.07, 0.15]:
            dist_factor = 1.0 - (abs(d_lat) + abs(d_lng)) * 2.2
            cell_risk = min(99.0, max(5.0, simulated_state["composite_risk_score"] * max(0.2, dist_factor)))
            spatial_contours.append({
                "lat": round(center_lat + d_lat, 4),
                "lng": round(center_lng + d_lng, 4),
                "simulated_risk_score": round(cell_risk, 1),
            })

    return {
        "region_id": region["id"],
        "region_name": region["name"],
        "scenario_parameters": {
            "delta_t_celsius": request.delta_t_celsius,
            "delta_iwv_pct": request.delta_iwv_pct,
            "soil_saturation": request.soil_saturation,
        },
        "baseline_state": {
            "precipitation_mm_hr": base_telemetry["precipitation"],
            "iwv_kg_m2": base_telemetry["iwv"],
            "cape_j_kg": base_telemetry["cape"],
            "cin_j_kg": base_telemetry["cin"],
        },
        "simulated_state": simulated_state,
        "critical_threshold_breaches": breaches,
        "spatial_risk_contours": spatial_contours,
        "clausius_clapeyron_scaling_pct": round(request.delta_t_celsius * 7.0, 1),
        "physical_narrative": (
            f"Applying +{request.delta_t_celsius}°C surface warming elevates CAPE to {simulated_state['simulated_cape_j_kg']} J/kg "
            f"via increased parcel buoyancy, while Clausius-Clapeyron scaling and +{request.delta_iwv_pct}% IWV push total moisture "
            f"to {simulated_state['simulated_iwv_kg_m2']} kg/m². At {int(request.soil_saturation * 100)}% soil saturation, "
            f"runoff acceleration reaches {simulated_state['runoff_acceleration_multiplier']}x baseline."
        )
    }
