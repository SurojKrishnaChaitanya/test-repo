import { create } from 'zustand';
import { alertsData } from '../data/alertsData';
import { predictSevereWeather } from '../services/mlInferenceService';
import { websocketService } from '../services/webSocketService';

// Single source of truth for region metadata — derived from alertsData so
// there is exactly one region list shared by every page (Live Map, Risk
// Analysis, Simulator, XAI Reports, Alert Ticker, Historical Data).
function formatRegionObject(regionIdOrObj) {
  if (!regionIdOrObj) return null;

  const regionId = typeof regionIdOrObj === 'string' ? regionIdOrObj : regionIdOrObj.regionId;
  const alert = alertsData.find((a) => a.regionId === regionId);
  if (!alert) return null;

  return {
    id: alert.regionId,
    name: alert.regionName,
    state: alert.state,
    lat: alert.lat,
    lng: alert.lng,
    hazardType: alert.hazardType,
    riskScore: alert.riskScore,
    severity: alert.severity,
  };
}

function getDefaultRegion() {
  const activeAlerts = alertsData.filter((a) => a.status === 'active');
  const highest = [...activeAlerts].sort((a, b) => b.riskScore - a.riskScore)[0];
  return formatRegionObject((highest || alertsData[0]).regionId);
}

export const useWeatherStore = create((set, get) => ({
  // ---- Region selection — single shared source across all 6 pages ----
  regions: alertsData.map((a) => formatRegionObject(a.regionId)),
  selectedRegion: getDefaultRegion(),

  setSelectedRegion: (regionIdOrObj) =>
    set({ selectedRegion: formatRegionObject(regionIdOrObj) }),

  activeTargetRegion: {
    id: 'default-target',
    name: 'National Centroid',
    state: 'Madhya Pradesh',
    lat: 22.5937,
    lng: 78.9629,
    baselineHazard: 'thunderstorm',
    baselineParams: { cape: 1200, iwv: 35, cin: -25, slope: 15, cttDrop: 4, precipitation: 25 },
  },
  setActiveTargetRegion: (target) => set({ activeTargetRegion: target }),

  // ---- Live Map forecast lead-time scrubber (+2h to +6h, per problem statement) ----
  forecastHorizon: { min: 1, max: 6, value: 1 },

  setForecastHorizonValue: (value) =>
    set((state) => ({
      forecastHorizon: {
        ...state.forecastHorizon,
        value: Math.min(Math.max(value, state.forecastHorizon.min), state.forecastHorizon.max),
      },
    })),

  // ---- Live Map hazard layer + render style ----
  mapLayers: {
    activeHazard: 'all', // 'all' | 'thunderstorm' | 'cloudburst' | 'flashFlood'
    renderStyle: 'heatmap', // 'heatmap' | 'contour'
  },

  setActiveHazard: (activeHazard) =>
    set((state) => ({ mapLayers: { ...state.mapLayers, activeHazard } })),

  setRenderStyle: (renderStyle) =>
    set((state) => ({ mapLayers: { ...state.mapLayers, renderStyle } })),

  // ---- Live model/inference output — see
  // mlInferenceService.js for the proxy integration ----
  currentRiskData: null,
  isLoading: false,
  error: null,
  isConnectedToWS: false,
  streamPaused: false,
  setStreamPaused: (paused) => set({ streamPaused: paused }),

  // ---- What-If Simulator parameters — full predictive matrix, matches the
  // problem statement's three ingredients (moisture, instability, kinematics) ----
  simulatorParameters: {
    precipitation: 60, // mm/h
    windSpeed: 40,      // km/h
    iwv: 45,            // kg/m²
    cape: 1800,         // J/kg
    cin: -15,           // J/kg
    cttDrop: 8,          // °C/30min
    slope: 18,          // ° CartoDEM slope gradient
  },

  setSimulatorParameters: (params) =>
    set((state) => ({ simulatorParameters: { ...state.simulatorParameters, ...params } })),

  // Seeds the simulator to the currently selected region's real telemetry —
  // called on region change so the sliders start from a realistic baseline.
  syncSimulatorToRegionTelemetry: (telemetry) => {
    if (!telemetry) return;
    set((state) => ({
      simulatorParameters: {
        ...state.simulatorParameters,
        precipitation: telemetry.rainfallRate ?? state.simulatorParameters.precipitation,
        windSpeed: telemetry.windGust ?? state.simulatorParameters.windSpeed,
        iwv: telemetry.iwv ?? state.simulatorParameters.iwv,
        cape: telemetry.cape ?? state.simulatorParameters.cape,
        cin: telemetry.cin ?? state.simulatorParameters.cin,
        cttDrop: telemetry.cttDrop30m ?? state.simulatorParameters.cttDrop,
        slope: telemetry.slope ?? state.simulatorParameters.slope ?? 18,
      },
    }));
  },

  // Resets the simulator parameters back to the baseline equilibrium state
  // and immediately re-evaluates the risk and XAI feature attributions.
  resetSimulatorParameters: () => {
    const active = get().activeTargetRegion;
    
    // Default fallback values if no region is active
    let resetParams = { precipitation: 25, windSpeed: 25, iwv: 35, cape: 1200, cin: -25, cttDrop: 4, slope: 15 };
    
    if (active && active.baselineParams) {
      resetParams = { ...active.baselineParams };
    }

    set({ simulatorParameters: resetParams });
    get().fetchRiskAnalysis(resetParams);
  },

  // ---- Core inference call — connects to backend /api/v1/indra-ai/predict ----
  fetchRiskAnalysis: async (telemetryOverride) => {
    const active = get().activeTargetRegion;
    // Fallback if no target is set
    const region = active || { id: 'default', name: 'National Overview', lat: 22.5937, lng: 78.9629 };

    const telemetry = telemetryOverride || get().simulatorParameters;

    set({ isLoading: true, error: null });
    try {
      const payload = {
        regionId: region.id,
        regionName: region.name,
        lat: region.lat,
        lng: region.lng,
        timestamp: new Date().toISOString(),
        telemetry,
      };

      const result = await predictSevereWeather(payload);
      set({ currentRiskData: result, isLoading: false });
    } catch (err) {
      set({ error: err.message || 'Failed to fetch risk analysis', isLoading: false });
    }
  },

  // ---- Live nowcast WebSocket / polling stream ----
  connectWebSocket: () => {
    const region = get().selectedRegion;
    if (!region) return;
    websocketService.disconnect();

    websocketService.connect(
      region.id,
      region,
      (frame) => set({currentRiskData: frame}),
      (status) => set({ isConnectedToWS: status })
    );
  },

  disconnectWebSocket: () => {
    websocketService.disconnect();
    set({ isConnectedToWS: false });
  },

  // ---- Alert Ticker filters ----
  alertFilters: {
    hazardType: 'all',
    severity: 'all',
    status: 'active',
    searchQuery: '',
  },

  setAlertFilters: (filters) =>
    set((state) => ({ alertFilters: { ...state.alertFilters, ...filters } })),

  // ---- Historical Replay playback ----
  replayState: {
    isPlaying: false,
    speed: 1,
    currentEventId: null,
    currentFrameIndex: 0,
  },

  setReplayState: (partial) =>
    set((state) => ({ replayState: { ...state.replayState, ...partial } })),
}));

export default useWeatherStore;