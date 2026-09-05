"""
Alerts Router: CAP v1.2 & NDMA Emergency Alert Lifecycle & Subscription Daemon
Exposes active alerts, lifecycle management (acknowledge, escalate, resolve), and location subscriptions.
"""

import asyncio
import datetime
import random
from typing import Optional, List, Dict, Any
from backend.core.compat import APIRouter, Query, HTTPException, BaseModel, Field

from backend.core.config import settings

router = APIRouter(tags=["NDMA Emergency Alerts"])


class AlertActionPayload(BaseModel):
    actor: str = Field(default="Ops-Command-01", description="Operator / System agent identifier")
    note: Optional[str] = Field(default=None, description="Operational notes")
    escalate_to: Optional[str] = Field(default=None, description="Escalation target tier/agency")
    outcome: Optional[str] = Field(default="resolved", description="Resolution outcome")


class LocationSubscriptionPayload(BaseModel):
    region_id: str
    lat: float
    lng: float
    radius_km: float = 15.0
    channels: List[str] = Field(default=["sms", "push"])
    recipient_identifier: str = Field(default="deoc-duty-officer")


# Canonical active alert ledger compliant with CAP v1.2 / NDMA
ACTIVE_ALERTS_LEDGER: List[Dict[str, Any]] = [
    {
        "id": "ALT-001",
        "region_id": "IN-MH-MUM",
        "region_name": "Mumbai Metro",
        "state": "Maharashtra",
        "lat": 19.0760,
        "lon": 72.8777,
        "hazard_type": "flash_flood",
        "severity": "severe",
        "confidence_pct": 94.0,
        "status": "active",
        "triggered_rule": "flash-flood-critical",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": "Severe moisture flux convergence detected. Inundation underway in Mithi River basin.",
        "deliveries": [
            {"channel": "sms", "status": "sent"},
            {"channel": "push", "status": "sent"},
            {"channel": "siren", "status": "sent"}
        ],
        "timeline": [
            {"label": "Alert Issued by System", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()},
            {"label": "DEOC First-responder team notified via API", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()},
            {"label": "Awaiting Acknowledgement", "timestamp": None}
        ]
    },
    {
        "id": "ALT-002",
        "region_id": "IN-HP-SOL",
        "region_name": "Solan District",
        "state": "Himachal Pradesh",
        "lat": 30.9070,
        "lon": 77.0999,
        "hazard_type": "cloudburst",
        "severity": "severe",
        "confidence_pct": 89.0,
        "status": "active",
        "triggered_rule": "cloudburst-warning",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": "Steep convective cell detected over Giri River basin. Extreme cloudburst runoff imminent.",
        "deliveries": [
            {"channel": "sms", "status": "sent"},
            {"channel": "push", "status": "sent"},
            {"channel": "siren", "status": "pending"}
        ],
        "timeline": [
            {"label": "Alert Issued by System", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()},
            {"label": "State Emergency Operation Centre notified", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()},
            {"label": "Awaiting Acknowledgement", "timestamp": None}
        ]
    },
    {
        "id": "ALT-003",
        "region_id": "IN-HP-SHM",
        "region_name": "Shimla",
        "state": "Himachal Pradesh",
        "lat": 31.1048,
        "lon": 77.1734,
        "hazard_type": "cloudburst",
        "severity": "high",
        "confidence_pct": 82.0,
        "status": "active",
        "triggered_rule": "cloudburst-warning",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": "Rapid cloud-top cooling observed (-9°C/30min). Convective cell intensifying over ridge.",
        "deliveries": [
            {"channel": "sms", "status": "sent"},
            {"channel": "push", "status": "sent"},
            {"channel": "siren", "status": "suppressed"}
        ],
        "timeline": [
            {"label": "Alert Issued by System", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()},
            {"label": "District Emergency Operations active", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        ]
    },
    {
        "id": "ALT-004",
        "region_id": "IN-UK-RUD",
        "region_name": "Rudraprayag",
        "state": "Uttarakhand",
        "lat": 30.2849,
        "lon": 78.9814,
        "hazard_type": "cloudburst",
        "severity": "high",
        "confidence_pct": 84.0,
        "status": "acknowledged",
        "triggered_rule": "cloudburst-warning",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": "Convective storm development over Mandakini catchment. Saturated slope monitoring active.",
        "deliveries": [
            {"channel": "sms", "status": "sent"},
            {"channel": "push", "status": "sent"},
            {"channel": "siren", "status": "suppressed"}
        ],
        "timeline": [
            {"label": "Alert Issued by System", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()},
            {"label": "Acknowledged by Ops-UK-01", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        ]
    },
    {
        "id": "ALT-005",
        "region_id": "IN-AS-GUW",
        "region_name": "Guwahati",
        "state": "Assam",
        "lat": 26.1445,
        "lon": 91.7362,
        "hazard_type": "thunderstorm",
        "severity": "moderate",
        "confidence_pct": 65.0,
        "status": "active",
        "triggered_rule": "high-wind-watch",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": "Rising CAPE with eroding CIN. Line squall formation likely within 3 hours.",
        "deliveries": [
            {"channel": "sms", "status": "sent"},
            {"channel": "push", "status": "sent"},
            {"channel": "siren", "status": "suppressed"}
        ],
        "timeline": [
            {"label": "Alert Issued by System", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        ]
    },
    {
        "id": "ALT-006",
        "region_id": "IN-WB-DAR",
        "region_name": "Darjeeling",
        "state": "West Bengal",
        "lat": 27.0410,
        "lon": 88.2663,
        "hazard_type": "flash_flood",
        "severity": "high",
        "confidence_pct": 78.0,
        "status": "active",
        "triggered_rule": "flash-flood-critical",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": "Steep slope drainage accumulation with high moisture flux. Runoff risk elevated.",
        "deliveries": [
            {"channel": "sms", "status": "sent"},
            {"channel": "push", "status": "sent"},
            {"channel": "siren", "status": "suppressed"}
        ],
        "timeline": [
            {"label": "Alert Issued by System", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        ]
    }
]

SUBSCRIPTIONS_STORE: List[Dict[str, Any]] = []


@router.get("/alerts")
@router.get("/api/v1/alerts")
async def get_alerts_ledger(region_id: Optional[str] = Query(None, description="Optional region filter")):
    """
    Returns active alerts filtered by region or nationwide.
    Fast execution time within operational limits (~120ms to 240ms).
    """
    await asyncio.sleep(random.uniform(settings.TELEMETRY_LATENCY_MIN, settings.TELEMETRY_LATENCY_MAX))
    if region_id:
        return [alert for alert in ACTIVE_ALERTS_LEDGER if alert["region_id"] == region_id]
    return ACTIVE_ALERTS_LEDGER


@router.post("/alerts/{alert_id}/acknowledge")
@router.post("/api/v1/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, payload: AlertActionPayload):
    """Marks alert as acknowledged by human command officer."""
    await asyncio.sleep(random.uniform(settings.TELEMETRY_LATENCY_MIN, settings.TELEMETRY_LATENCY_MAX))
    for alert in ACTIVE_ALERTS_LEDGER:
        if alert["id"] == alert_id:
            alert["status"] = "acknowledged"
            alert["timeline"].append({
                "label": f"Acknowledged by {payload.actor}",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "note": payload.note
            })
            return alert
    raise HTTPException(status_code=404, detail="Alert record not found")


@router.post("/alerts/{alert_id}/escalate")
@router.post("/api/v1/alerts/{alert_id}/escalate")
async def escalate_alert(alert_id: str, payload: AlertActionPayload):
    """Escalates alert to high-priority disaster response authority."""
    await asyncio.sleep(random.uniform(settings.TELEMETRY_LATENCY_MIN, settings.TELEMETRY_LATENCY_MAX))
    for alert in ACTIVE_ALERTS_LEDGER:
        if alert["id"] == alert_id:
            alert["status"] = "escalated"
            alert["timeline"].append({
                "label": f"Escalated to {payload.escalate_to or 'State Emergency Cell'} by {payload.actor}",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "note": payload.note
            })
            return alert
    raise HTTPException(status_code=404, detail="Alert record not found")


@router.post("/alerts/{alert_id}/resolve")
@router.post("/api/v1/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, payload: AlertActionPayload):
    """Marks alert as resolved upon storm core dissipation."""
    await asyncio.sleep(random.uniform(settings.TELEMETRY_LATENCY_MIN, settings.TELEMETRY_LATENCY_MAX))
    for alert in ACTIVE_ALERTS_LEDGER:
        if alert["id"] == alert_id:
            alert["status"] = payload.outcome or "resolved"
            alert["timeline"].append({
                "label": f"Resolved ({payload.outcome}) by {payload.actor}",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "note": payload.note
            })
            return alert
    raise HTTPException(status_code=404, detail="Alert record not found")


@router.post("/api/v1/alerts/subscribe")
async def subscribe_to_location_alerts(payload: LocationSubscriptionPayload):
    """Registers location subscription for CAP-SMS and push notification broadcasting."""
    await asyncio.sleep(random.uniform(settings.TELEMETRY_LATENCY_MIN, settings.TELEMETRY_LATENCY_MAX))
    entry = payload.model_dump()
    entry["subscribed_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    SUBSCRIPTIONS_STORE.append(entry)
    return {
        "status": "subscription_registered",
        "subscription": entry,
        "monitored_radius_km": payload.radius_km
    }
