// src/services/alertingService.js
//
// Bridges the frontend to the Automated Alerting API.
// Defaults to the alertsData dataset and queries the live API via the proxy
// when VITE_USE_REAL_ALERTS=true or fallback is triggered.

import { alertsData } from '../data/alertsData';

const PROXY_BASE_URL = import.meta.env.VITE_API_PROXY_URL || '/api/v1/indra-ai';
const API_BASE_URL = import.meta.env.VITE_ALERTING_API_URL || PROXY_BASE_URL;
export const USE_REAL_ALERTS = import.meta.env.VITE_USE_REAL_ALERTS === 'true';

// ---------------------------------------------------------------------------
// Field mapping: API (snake_case) -> frontend shape (camelCase)
// ---------------------------------------------------------------------------

const HAZARD_MAP = {
  thunderstorm: 'thunderstorm',
  cloudburst: 'cloudburst',
  flash_flood: 'flashFlood',
};

// AlertCard's statusClasses only styles active/acknowledged/resolved — map
// the API's extra escalated/false_alarm states onto the closest existing visual bucket.
const STATUS_MAP = {
  active: 'active',
  acknowledged: 'acknowledged',
  escalated: 'active',
  resolved: 'resolved',
  false_alarm: 'resolved',
};

function mapApiAlertToFrontend(apiAlert) {
  const deliveredChannels = new Set(
    (apiAlert.deliveries || [])
      .filter((d) => d.status === 'sent')
      .map((d) => d.channel)
  );

  return {
    id: apiAlert.id,
    regionId: apiAlert.region_id,
    regionName: apiAlert.region_name,
    state: apiAlert.state,
    lat: apiAlert.lat,
    lng: apiAlert.lon,
    hazardType: HAZARD_MAP[apiAlert.hazard_type] || apiAlert.hazard_type,
    severity: apiAlert.severity,
    riskScore: Math.round(apiAlert.confidence_pct),
    confidence: Math.round(apiAlert.confidence_pct),
    status: STATUS_MAP[apiAlert.status] || apiAlert.status,
    triggeredThresholdId: apiAlert.triggered_rule || null,
    timestamp: apiAlert.created_at,
    description: apiAlert.summary,
    delivery: {
      sms: deliveredChannels.has('sms'),
      push: deliveredChannels.has('push'),
      siren: deliveredChannels.has('siren'),
    },
    statusTimeline: (apiAlert.timeline || []).map((event) => ({
      label: event.label,
      time: event.timestamp,
    })),
    _raw: apiAlert,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches the current alert list from the live API. Falls back to
 * alertsData if real alerts are disabled, OR if the live request fails —
 * so a backend outage never blanks the Alert Ticker.
 *
 * @param {string} [regionId] - When provided, scopes the fetch to just
 *   that region's alerts. When omitted, returns alerts for every region.
 */
export async function fetchAlerts(regionId) {
  if (!USE_REAL_ALERTS) {
    return regionId ? alertsData.filter((a) => a.regionId === regionId) : alertsData;
  }

  try {
    const url = regionId
      ? `${API_BASE_URL}/alerts?region_id=${encodeURIComponent(regionId)}`
      : `${API_BASE_URL}/alerts`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Alerts HTTP ${response.status}`);
    const data = await response.json();
    return data.map(mapApiAlertToFrontend);
  } catch (err) {
    console.error('Live alert fetch failed, falling back to local alerts:', err);
    return regionId ? alertsData.filter((a) => a.regionId === regionId) : alertsData;
  }
}

export async function acknowledgeAlert(alertId, actor, note) {
  if (!USE_REAL_ALERTS) {
    console.warn('acknowledgeAlert called in offline mode — no backend to update.');
    return null;
  }
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor, note }),
  });
  if (!response.ok) throw new Error(`Acknowledge HTTP ${response.status}`);
  return mapApiAlertToFrontend(await response.json());
}

export async function escalateAlert(alertId, actor, escalateTo, note) {
  if (!USE_REAL_ALERTS) {
    console.warn('escalateAlert called in offline mode — no backend to update.');
    return null;
  }
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor, escalate_to: escalateTo, note }),
  });
  if (!response.ok) throw new Error(`Escalate HTTP ${response.status}`);
  return mapApiAlertToFrontend(await response.json());
}

export async function resolveAlert(alertId, actor, outcome = 'resolved', note) {
  if (!USE_REAL_ALERTS) {
    console.warn('resolveAlert called in offline mode — no backend to update.');
    return null;
  }
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor, outcome, note }),
  });
  if (!response.ok) throw new Error(`Resolve HTTP ${response.status}`);
  return mapApiAlertToFrontend(await response.json());
}

export default { fetchAlerts, acknowledgeAlert, escalateAlert, resolveAlert, USE_REAL_ALERTS };