/**
 * INDRA AI - Enterprise TypeScript Definitions & Service Contracts
 * Spatial Resolution: 3km EPSG:4326 / LCC
 * Reanalysis & Observation: ERA5 Reanalysis + INSAT-3D/3DR (WV/TIR) + CartoDEM
 * Model Architecture: Earthformer-ConvLSTM-DGMR-DualTask
 * Inference Engine: TensorRT-LLM-Triton-V2.4
 * Temporal Window: t-6h to t+6h with 30-minute step resolution
 * Compute Node: hf-dgx-a100-mig-3g.40gb
 */

// ============================================================================
// 1. SPATIAL & ATMOSPHERIC GRID CELL (3x3 km)
// ============================================================================

export type CoordinateReferenceSystem = 'EPSG:4326' | 'EPSG:3857' | 'LCC_INDIA';

export interface GeoCentroid {
  lat: number;
  lng: number;
  elevationMeters: number;
}

export interface GridBoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Era5IwvAnomaly {
  /** Total precipitable water / integrated water vapor in kg/m² */
  valueKgM2: number;
  /** Climatological 30-day baseline for the 3x3 km cell */
  baselineKgM2: number;
  /** Anomaly deviation in percentage relative to baseline */
  anomalyPct: number;
  /** Sigma departure (standard deviations from mean) */
  sigmaLevel: number;
  /** Rapid moisture accumulation flag */
  isSurgeActive: boolean;
}

export interface Era5Thermodynamics {
  /** Convective Available Potential Energy (J/kg) */
  capeJkg: number;
  /** Convective Inhibition (J/kg, typically negative) */
  cinJkg: number;
  /** Lifted Index (°C) */
  liftedIndexCelsius: number;
  /** K-Index stability index (°C) */
  kIndex: number;
  /** Equivalent Potential Temperature (Theta-e) at 850 hPa in Kelvin */
  thetaEKelvin: number;
}

export interface InsatObservations {
  /** Cloud Top Temperature from Thermal IR channel 10.8 µm (°C) */
  cttCelsius: number;
  /** 30-minute rate of cooling (°C / 30 min) */
  cttDropRate30m: number;
  /** Brightness temperature from Water Vapor channel 6.5–7.1 µm (Kelvin) */
  wvBrightnessTempK: number;
  /** Brightness temperature from Thermal IR channel 10.8 µm (Kelvin) */
  tirBrightnessTempK: number;
  /** Water Vapor - Thermal IR brightness temperature difference (Kelvin) */
  btdWvTirK: number;
  /** Deep convective cloud mask */
  deepConvectionDetected: boolean;
}

export interface KinematicVectors {
  /** Zonal wind component at 850 hPa (m/s) */
  uComponentMs: number;
  /** Meridional wind component at 850 hPa (m/s) */
  vComponentMs: number;
  /** Low-level moisture flux convergence (-∇ · (qV)) in g/(kg · s) */
  moistureFluxConvergence: number;
  /** Relative vorticity at 850 hPa (10⁻⁵ s⁻¹) */
  relativeVorticity10e5: number;
  /** Maximum estimated surface wind gust (km/h) */
  surfaceWindGustKmh: number;
}

export interface CartoDemIndices {
  /** Mean slope angle within the 3x3 km cell (degrees) */
  meanSlopeDegrees: number;
  /** Predominant aspect orientation (degrees azimuth) */
  aspectAzimuthDegrees: number;
  /** Drainage density index (stream channel length per unit area, km/km²) */
  drainageDensityIndex: number;
  /** Upstream flow accumulation area (km²) */
  flowAccumulationKm2: number;
  /** Topographic Wetness Index (TWI = ln(a / tan β)) */
  topographicWetnessIndex: number;
  /** Terrain-induced runoff amplification factor (0.5 to 2.5) */
  runoffAmplificationFactor: number;
}

export type SevereHazardType = 'thunderstorm' | 'cloudburst' | 'flashFlood';

export interface HazardProbabilities {
  thunderstorm: number; // 0.0 to 1.0
  cloudburst: number;   // 0.0 to 1.0
  flashFlood: number;   // 0.0 to 1.0
  compositeRiskScore: number; // 0 to 100
  dominantHazard: SevereHazardType;
}

export interface AtmosphericGridCell {
  cellId: string;
  gridResolutionKm: 3;
  crs: CoordinateReferenceSystem;
  centroid: GeoCentroid;
  bounds: GridBoundingBox;
  iwvAnomaly: Era5IwvAnomaly;
  thermodynamics: Era5Thermodynamics;
  satelliteObs: InsatObservations;
  kinematics: KinematicVectors;
  demIndices: CartoDemIndices;
  hazards: HazardProbabilities;
  lastUpdatedUtc: string;
}

// ============================================================================
// 2. TEMPORAL FRAMES (13 Past Frames t-6.0h to t-0, 12 Nowcast Frames t+0.5h to t+6.0h)
// ============================================================================

export type PastTimeOffset =
  | '-6.0h' | '-5.5h' | '-5.0h' | '-4.5h' | '-4.0h'
  | '-3.5h' | '-3.0h' | '-2.5h' | '-2.0h' | '-1.5h'
  | '-1.0h' | '-0.5h' | '0.0h';

export type ForecastTimeOffset =
  | '+0.5h' | '+1.0h' | '+1.5h' | '+2.0h' | '+2.5h' | '+3.0h'
  | '+3.5h' | '+4.0h' | '+4.5h' | '+5.0h' | '+5.5h' | '+6.0h';

export type TemporalOffset = PastTimeOffset | ForecastTimeOffset;

export interface FrameRasterMetadata {
  channel: 'INSAT_3DR_TIR1' | 'INSAT_3DR_WV' | 'DOPPLER_MAX_DBZ' | 'ERA5_IWV_ANOMALY';
  rasterDimensions: [number, number]; // [width, height]
  units: string;
  minScaleValue: number;
  maxScaleValue: number;
}

export interface TemporalFrame {
  frameIndex: number;
  offset: TemporalOffset;
  offsetMinutes: number; // e.g. -360 to +360
  isObservation: boolean; // true for past/now, false for nowcast
  timestampUtc: string;
  gridSummary: {
    meanIwv: number;
    maxCape: number;
    minCtt: number;
    maxPrecipRateMmHr: number;
    peakCompositeRisk: number;
  };
  rasterMeta: FrameRasterMetadata;
  rasterOverlayUrl?: string;
  hotspotsCount: number;
}

export interface TemporalFrameSequence {
  sequenceId: string;
  regionId: string;
  anchorTimestampUtc: string; // t-0 timestamp
  temporalResolutionMinutes: 30;
  totalPastFrames: 13;
  totalNowcastFrames: 12;
  totalFrames: 25;
  pastFrames: TemporalFrame[];
  nowcastFrames: TemporalFrame[];
}

// ============================================================================
// 3. XAI ATTRIBUTION & WHAT-IF SIMULATION PARAMS
// ============================================================================

export interface FeatureImpactAttribution {
  featureName: string;
  featureKey: 'iwv' | 'cape' | 'cin' | 'cttDrop' | 'windSpeed' | 'terrainSlope' | 'drainageDensity' | 'soilSaturation';
  baselineValue: number;
  observedValue: number;
  unit: string;
  attributionScore: number; // e.g., -100 to +100
  relativeImportancePct: number; // 0 to 100
  influenceDirection: 'amplifying' | 'mitigating';
  physicalExplanation: string;
}

export interface SpatiotemporalAttentionMap {
  gridDimensions: [number, number]; // e.g., [5, 5] or [32, 32]
  attentionWeights: number[][]; // normalized 0.0 to 1.0
  focalCellCoordinate: [number, number]; // row, col of peak attention
  attentionHeadCount: number;
  layerIndex: number;
  receptiveFieldRadiusKm: number;
}

export interface IntegratedGradientsReport {
  convergenceDelta: number;
  targetStepCount: number;
  topDrivers: FeatureImpactAttribution[];
  plainLanguageSummary: string;
  staInsights: string;
  igInsights: string;
  dgmrProjectionInsights: string;
}

export interface XAIAttributionData {
  predictionId: string;
  generatedAt: string;
  hazardType: SevereHazardType;
  modelConfidence: number; // 0.0 to 1.0
  attentionGrid: number[][];
  spatialAttention: SpatiotemporalAttentionMap;
  featureImportance: FeatureImpactAttribution[];
  integratedGradients: IntegratedGradientsReport;
  xaiExplanation: string;
}

export interface WhatIfSimulationParams {
  /** Target region identifier */
  regionId?: string;
  /** Instantaneous precipitation rate (0 to 200 mm/h) */
  precipitationRateMmHr: number;
  /** Surface wind gust speed (0 to 200 km/h) */
  windSpeedKmh: number;
  /** Integrated water vapor (0 to 100 kg/m²) */
  iwvKgM2: number;
  /** Convective Available Potential Energy (0 to 5000 J/kg) */
  capeJkg: number;
  /** Convective Inhibition (-100 to 0 J/kg) */
  cinJkg: number;
  /** Cloud top temperature cooling rate over 30 min (0 to 30 °C/30min) */
  cttDropRate30m: number;
  /** Soil moisture saturation percentage (0 to 100%) */
  soilSaturationPct?: number;
  /** Drainage maintenance reduction / blockage factor (0.0 to 1.0) */
  drainageBlockageFactor?: number;
}

export interface WhatIfSimulationResult {
  simulationId: string;
  executedAt: string;
  baselineRiskScore: number;
  simulatedRiskScore: number;
  riskDelta: number;
  baselineHazard: SevereHazardType;
  simulatedHazard: SevereHazardType;
  confidence: number;
  hourlyProjection: Array<{ hour: number; risk: number }>;
  activeBreaches: Array<{
    ruleId: string;
    label: string;
    tier: 'advisory' | 'watch' | 'warning' | 'critical';
    thresholdExceeded: string;
  }>;
  featureAttributionShift: FeatureImpactAttribution[];
  simulationNarrative: string;
}

// ============================================================================
// 4. MULTILINGUAL RAG ADVISORIES (8 Indian Languages + NDMA Guidelines)
// ============================================================================

export type SupportedIndianLanguage =
  | 'en' // English
  | 'hi' // Hindi (हिन्दी)
  | 'bn' // Bengali (বাংলা)
  | 'ta' // Tamil (தமிழ்)
  | 'te' // Telugu (తెలుగు)
  | 'mr' // Marathi (मराठी)
  | 'gu' // Gujarati (ગુજરાતી)
  | 'ml'; // Malayalam (മലയാളം)

export interface LanguageMeta {
  code: SupportedIndianLanguage;
  nameEnglish: string;
  nativeScript: string;
  textDirection: 'ltr' | 'rtl';
}

export const SUPPORTED_INDIAN_LANGUAGES: Record<SupportedIndianLanguage, LanguageMeta> = {
  en: { code: 'en', nameEnglish: 'English', nativeScript: 'English', textDirection: 'ltr' },
  hi: { code: 'hi', nameEnglish: 'Hindi', nativeScript: 'हिन्दी', textDirection: 'ltr' },
  bn: { code: 'bn', nameEnglish: 'Bengali', nativeScript: 'বাংলা', textDirection: 'ltr' },
  ta: { code: 'ta', nameEnglish: 'Tamil', nativeScript: 'தமிழ்', textDirection: 'ltr' },
  te: { code: 'te', nameEnglish: 'Telugu', nativeScript: 'తెలుగు', textDirection: 'ltr' },
  mr: { code: 'mr', nameEnglish: 'Marathi', nativeScript: 'मराठी', textDirection: 'ltr' },
  gu: { code: 'gu', nameEnglish: 'Gujarati', nativeScript: 'ગુજરાતી', textDirection: 'ltr' },
  ml: { code: 'ml', nameEnglish: 'Malayalam', nativeScript: 'മലയാളം', textDirection: 'ltr' },
};

export interface NdmaCitationRef {
  guidelineId: string;
  sectionCode: string;
  title: string;
  publicationYear: number;
  sourceAuthority: 'NDMA' | 'SDMA' | 'IMD' | 'CWC';
  sourceUrl?: string;
  relevantExcerpt: string;
}

export interface LocalizedAdvisoryContent {
  language: SupportedIndianLanguage;
  languageName: string;
  headline: string;
  advisoryText: string;
  immediateActions: string[];
  safetyPrecautions: string[];
  helplineNumbers: string[];
}

export interface MultilingualRagAdvisory {
  advisoryId: string;
  regionId: string;
  regionName: string;
  hazardType: SevereHazardType;
  severityTier: 'low' | 'moderate' | 'high' | 'severe' | 'catastrophic';
  riskScore: number;
  generatedAt: string;
  primaryLanguage: SupportedIndianLanguage;
  translations: Record<SupportedIndianLanguage, LocalizedAdvisoryContent>;
  citedSources: NdmaCitationRef[];
  confidenceScore: number;
  audioBroadcastAvailable?: boolean;
}

// ============================================================================
// 5. SYSTEM TELEMETRY VITALS
// ============================================================================

export interface GpuComputeNodeVitals {
  nodeId: 'hf-dgx-a100-mig-3g.40gb' | string;
  migInstance: '3g.40gb';
  gpuUtilizationPct: number;
  vramAllocatedGb: number;
  vramTotalGb: 40;
  temperatureCelsius: number;
  powerDrawWatts: number;
  cudaDriverVersion: string;
  tensorCoreActivityPct: number;
}

export interface TritonInferenceEngineVitals {
  engineName: 'TensorRT-LLM-Triton-V2.4';
  modelArchitecture: 'Earthformer-ConvLSTM-DGMR-DualTask';
  spatialResolution: '3km_EPSG4326_LCC';
  temporalWindow: 't-6h_to_t+6h_step30m';
  activeBatchSize: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputFramesPerSec: number;
  queueDepth: number;
  uptimeSeconds: number;
}

export interface PipelineIngestionVitals {
  insat3dIngestDelaySec: number;
  era5AssimilationLagMin: number;
  cartoDemTileCacheHitRatePct: number;
  activeWebSocketSubscribers: number;
  lastSuccessfulSyncUtc: string;
}

export interface SystemTelemetryVitals {
  timestampUtc: string;
  computeNode: GpuComputeNodeVitals;
  inferenceEngine: TritonInferenceEngineVitals;
  ingestion: PipelineIngestionVitals;
  systemStatus: 'healthy' | 'degraded' | 'critical';
}

// ============================================================================
// 6. NDMA-COMPLIANT ALERT NOTIFICATIONS (CAP v1.2 Standard)
// ============================================================================

export type AlertSeverityTier = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
export type AlertUrgencyTier = 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
export type AlertCertaintyTier = 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
export type AlertStatus = 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft';
export type AlertMessageType = 'Alert' | 'Update' | 'Cancel' | 'Ack' | 'Error';

export interface AlertDeliveryChannels {
  smsCellBroadcast: boolean;
  mobilePushNotification: boolean;
  acousticSirenSystem: boolean;
  emergencyRadioTvBroadcast: boolean;
}

export interface AlertStatusTimelineEntry {
  label: string;
  timestamp: string | null;
  actor?: string;
  notes?: string;
}

export interface NdmaCompliantAlert {
  /** Unique alert identifier compliant with Common Alerting Protocol (CAP) */
  id: string;
  identifier: string;
  senderId: string;
  sentAt: string;
  status: AlertStatus;
  msgType: AlertMessageType;
  scope: 'Public' | 'Restricted' | 'Private';
  category: 'Met' | 'Safety' | 'Rescue';
  eventCode: 'IN-THUNDERSTORM' | 'IN-CLOUDBURST' | 'IN-FLASHFLOOD';
  urgency: AlertUrgencyTier;
  severity: AlertSeverityTier;
  certainty: AlertCertaintyTier;
  
  // Geospatial target
  regionId: string;
  regionName: string;
  state: string;
  lat: number;
  lng: number;
  polygonGeoJson?: object;

  // Quantitative risk and physical drivers
  hazardType: SevereHazardType;
  riskScore: number;
  confidencePct: number;
  triggeredThresholdRule: string | null;
  spatialResolution: '3km_EPSG4326_LCC';

  // Multilingual advisory summary
  headline: string;
  description: string;
  instruction: string;
  translations?: Partial<Record<SupportedIndianLanguage, { headline: string; description: string; instruction: string }>>;

  // Dissemination & delivery
  delivery: AlertDeliveryChannels;
  timeline: AlertStatusTimelineEntry[];
}
