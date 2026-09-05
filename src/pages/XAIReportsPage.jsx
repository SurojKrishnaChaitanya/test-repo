import React, { useEffect, useMemo } from 'react';
import { useWeatherStore } from '../store/useWeatherStore';
import { telemetryData } from '../data/telemetryData';
import { calculateFeatureAttributions } from '../utils/xaiAttribution';
import PanIndiaHeatmapCanvas from '../components/xai/PanIndiaHeatmapCanvas';
import {
  Cpu,
  MapPin,
  FileText,
  Droplets,
  Zap,
  ThermometerSnowflake,
  Mountain,
  ShieldAlert,
  Satellite,
  Layers,
  Flame,
} from 'lucide-react';

export const XAIReportsPage = () => {
  const selectedRegion = useWeatherStore((state) => state.selectedRegion);
  const currentRiskData = useWeatherStore((state) => state.currentRiskData);
  const fetchRiskAnalysis = useWeatherStore((state) => state.fetchRiskAnalysis);

  useEffect(() => {
    if (selectedRegion) fetchRiskAnalysis();
  }, [selectedRegion?.id, fetchRiskAnalysis]);

  if (!selectedRegion) {
    return (
      <div className="p-6 text-sm text-slate-400">
        Select a region to view Explainable AI (XAI) diagnostics.
      </div>
    );
  }

  // Live telemetry resolution for selected region
  const regionTelemetry = (selectedRegion && telemetryData[selectedRegion.id]?.current) || {};

  const iwvVal = regionTelemetry.iwv ?? (currentRiskData?.metrics?.iwvMoisture ? parseFloat(currentRiskData.metrics.iwvMoisture) : 52);
  const capeVal = regionTelemetry.cape ?? (currentRiskData?.metrics?.cape ? parseFloat(currentRiskData.metrics.cape) : 2400);
  const cinVal = regionTelemetry.cin ?? (currentRiskData?.metrics?.cin ? parseFloat(currentRiskData.metrics.cin) : -12);
  const cttDropVal = regionTelemetry.cttDrop30m ?? (currentRiskData?.metrics?.cttDropRate ? Math.abs(parseFloat(currentRiskData.metrics.cttDropRate)) : 8);
  const precipVal = regionTelemetry.rainfallRate ?? (currentRiskData?.metrics?.precipitationRate ? parseFloat(currentRiskData.metrics.precipitationRate) : 65);
  const slopeVal = (selectedRegion?.id?.includes('HP') || selectedRegion?.id?.includes('UK') || selectedRegion?.id?.includes('WB')) ? 28 : (selectedRegion?.id?.includes('MUM') || selectedRegion?.id?.includes('CHE')) ? 8 : 16;

  // Dynamically compute physics-grounded feature attributions summing to 100%
  const xaiResult = useMemo(() => {
    return calculateFeatureAttributions({
      iwv: iwvVal,
      cape: capeVal,
      cin: cinVal,
      slope: slopeVal,
      cttDrop: cttDropVal,
      precipitation: precipVal,
    });
  }, [iwvVal, capeVal, cinVal, slopeVal, cttDropVal, precipVal]);

  const attrIwv = xaiResult.attributions.find((a) => a.id === 'iwv') || { percentage: 34 };
  const attrBuoyancy = xaiResult.attributions.find((a) => a.id === 'buoyancy') || { percentage: 28 };
  const attrSlope = xaiResult.attributions.find((a) => a.id === 'slope') || { percentage: 16 };
  const attrUpdraft = xaiResult.attributions.find((a) => a.id === 'updraft') || { percentage: 22 };

  return (
    <div className="p-6 space-y-6 bg-slate-50 h-full overflow-y-auto text-slate-900 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-2xl text-purple-600 shadow-sm">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Explainable AI (XAI) Attribution Module</h1>
            <p className="text-xs text-slate-500">
              Integrated Gradients & Multi-Sensor Diagnostic Graph over 3x3 km Earthformer-DGMR Framework
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-slate-700">
            <MapPin className="w-4 h-4 text-purple-600" />
            <span>Target: <strong>{selectedRegion.name}, {selectedRegion.state}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Risk Score: {currentRiskData?.riskScore ?? selectedRegion.riskScore ?? 84}/100</span>
          </div>
        </div>
      </div>

      {/* Top 4 Convective Catalyst Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Catalyst 1: Moisture Influx */}
        <div className={`p-4 rounded-2xl bg-white border shadow-sm space-y-2 relative overflow-hidden transition-all ${
          attrIwv.isDominant ? 'border-cyan-400 ring-2 ring-cyan-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
              <Droplets className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-mono font-bold">
              {attrIwv.percentage}% ATTRIBUTION
            </span>
          </div>
          <h3 className="text-xs font-bold text-slate-900">1. Moisture Influx & IWV Pool (IMDAA)</h3>
          <p className="text-lg font-black text-cyan-700 font-mono">
            {iwvVal} kg/m² ({iwvVal > 45 ? `+${Math.round(((iwvVal - 40) / 40) * 100)}%` : 'Nominal'})
          </p>
          <p className="text-[11px] text-slate-500 leading-snug">
            {attrIwv.description || 'INSAT-3D WV channel confirms deep tropospheric column saturation and sustained moisture flux convergence.'}
          </p>
        </div>

        {/* Catalyst 2: Instability & Updraft Buoyancy */}
        <div className={`p-4 rounded-2xl bg-white border shadow-sm space-y-2 relative overflow-hidden transition-all ${
          attrBuoyancy.isDominant ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <Zap className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
              {attrBuoyancy.percentage}% ATTRIBUTION
            </span>
          </div>
          <h3 className="text-xs font-bold text-slate-900">2. Instability & Buoyancy (IMDAA)</h3>
          <p className="text-lg font-black text-rose-600 font-mono">{capeVal} J/kg CAPE</p>
          <p className="text-[11px] text-slate-500 leading-snug">
            CIN barrier ({cinVal} J/kg) {Math.abs(cinVal) < 20 ? 'eroded, permitting rapid explosive parcel ascent.' : 'capping boundary layer convection.'}
          </p>
        </div>

        {/* Catalyst 3: Convective Updraft Velocity */}
        <div className={`p-4 rounded-2xl bg-white border shadow-sm space-y-2 relative overflow-hidden transition-all ${
          attrUpdraft.isDominant ? 'border-purple-400 ring-2 ring-purple-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <ThermometerSnowflake className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
              {attrUpdraft.percentage}% ATTRIBUTION
            </span>
          </div>
          <h3 className="text-xs font-bold text-slate-900">3. Updraft Velocity (INSAT-3D)</h3>
          <p className="text-lg font-black text-purple-600 font-mono">-{cttDropVal}°C / 30min</p>
          <p className="text-[11px] text-slate-500 leading-snug">
            {attrUpdraft.description || 'INSAT-3DR 10.8 µm TIR cooling rate detects violent vertical updrafts penetrating equilibrium levels.'}
          </p>
        </div>

        {/* Catalyst 4: Topographical Runoff Channeling */}
        <div className={`p-4 rounded-2xl bg-white border shadow-sm space-y-2 relative overflow-hidden transition-all ${
          attrSlope.isDominant ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Mountain className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
              {attrSlope.percentage}% ATTRIBUTION
            </span>
          </div>
          <h3 className="text-xs font-bold text-slate-900">4. Runoff Channeling (CartoDEM)</h3>
          <p className="text-lg font-black text-amber-600 font-mono">{slopeVal}° Slope Gradient</p>
          <p className="text-[11px] text-slate-500 leading-snug">
            {attrSlope.description || 'CartoDEM 30m slope and drainage convergence index focuses heavy precipitation into flash flood torrents.'}
          </p>
        </div>
      </div>

      {/* UPGRADED Pan-India Multi-Sensor Stream Section */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Satellite className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Pan-India Multi-Sensor Observation & Reanalysis Stream
              </h2>
              <p className="text-xs text-slate-500">
                Continuous Subcontinental Heatmaps across 8°N–37°N, 68°E–97°E at 3x3 km Spatial Resolution (EPSG:4326)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg border border-sky-200">
              IMDAA + INSAT-3D/3DR + CartoDEM
            </span>
          </div>
        </div>

        {/* Dual Pan-India Heatmap Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: IMDAA Convective Thermodynamic Heatmap */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  IMDAA Convective Thermodynamic Heatmap (Pan-India)
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                IWV & CAPE INSTABILITY
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              National atmospheric instability synthesis combining IMDAA reanalysis Integrated Water Vapor (IWV) anomalies and Convective Available Potential Energy (CAPE) across the Indian subcontinent.
            </p>
            <PanIndiaHeatmapCanvas mode="thermodynamic" selectedRegion={selectedRegion} />
          </div>

          {/* Right Panel: INSAT-3D/3DR + CartoDEM Multi-Sensor Fusion */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  INSAT-3D/3DR + CartoDEM Multi-Sensor Fusion (Pan-India)
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                TIR CTT & RUNOFF CONVERGENCE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Satellite infrared cloud-top temperature cooling rate (10.8 µm TIR) fused with CartoDEM 30m geomorphic hydrograph slope convergence indices over mountain catchments.
            </p>
            <PanIndiaHeatmapCanvas mode="multiSensor" selectedRegion={selectedRegion} />
          </div>
        </div>

        {/* Briefing Panel: Diagnostic XAI Briefing */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-purple-600">
            <FileText className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Diagnostic XAI Briefing</h3>
          </div>
          <div className="text-xs leading-relaxed text-slate-700 bg-purple-50/70 rounded-xl p-4 border border-purple-200/60 space-y-2.5">
            <p>
              <strong className="text-purple-900">Dominant Convective Driver ({xaiResult.dominantDriver?.name}):</strong> {xaiResult.narrative}
            </p>
            <p className="text-slate-600">
              <strong className="text-slate-800">Pan-India Diagnostic Synthesis:</strong> Subcontinental reanalysis and geostationary observations locate peak convective intensification over the <strong>{selectedRegion.name} ({selectedRegion.state})</strong> centroid [{selectedRegion.lat.toFixed(2)}°N, {selectedRegion.lng.toFixed(2)}°E]. Deep tropospheric moisture saturation ({iwvVal} kg/m² IMDAA), coupled with strong thermodynamic buoyancy ({capeVal} J/kg CAPE) and rapid INSAT-3DR thermal cooling (-{cttDropVal}°C/30min), accelerates hydro-geomorphic concentration through CartoDEM drainage contours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XAIReportsPage;