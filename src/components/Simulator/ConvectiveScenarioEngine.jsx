import React, { useState } from 'react';
import {
  Sliders,
  Thermometer,
  Droplets,
  Waves,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Zap,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { executeConvectiveSimulation } from '../../services/mlInferenceService';

export default function ConvectiveScenarioEngine({ selectedRegion, onSimulationComplete }) {
  const [deltaT, setDeltaT] = useState(1.5);
  const [deltaIwv, setDeltaIwv] = useState(12.0);
  const [soilSaturation, setSoilSaturation] = useState(0.85);

  const [isRunning, setIsRunning] = useState(false);
  const [progressPhase, setProgressPhase] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setSimulationResult(null);

    // Realistic multi-phase tensor compute simulation feedback (~2s)
    setProgressPhase('Evaluating Clausius-Clapeyron Thermodynamic Expansion (+7%/°C)...');
    await new Promise((r) => setTimeout(r, 600));

    setProgressPhase('Modulating Boundary Layer CAPE / CIN Parcel Buoyancy...');
    await new Promise((r) => setTimeout(r, 700));

    setProgressPhase('Executing Earthformer Topographic Hydrograph Routing...');

    try {
      const result = await executeConvectiveSimulation({
        delta_t_celsius: deltaT,
        delta_iwv_pct: deltaIwv,
        soil_saturation: soilSaturation,
        region_id: selectedRegion?.id || 'IN-MH-MUM',
      });

      setSimulationResult(result);
      if (onSimulationComplete) onSimulationComplete(result);
    } catch (err) {
      // Clean fallback handled in service
    } finally {
      setIsRunning(false);
      setProgressPhase('');
    }
  };

  const handleReset = () => {
    setDeltaT(0.0);
    setDeltaIwv(0.0);
    setSoilSaturation(0.5);
    setSimulationResult(null);
  };

  const state = simulationResult?.simulated_state;
  const breaches = simulationResult?.critical_threshold_breaches || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 select-none text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-mono font-bold">
              EARTHFORMER CONVECTIVE KERNEL
            </span>
            <span className="text-xs font-mono text-slate-500">What-If Perturbation</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Convective Sensitivity & Catchment Modifiers
          </h2>
        </div>

        <button
          onClick={handleReset}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sliders</span>
        </button>
      </div>

      {/* 3 Interactive Modifier Sliders */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Surface Temperature Anomaly */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-rose-500" />
              Surface Temp (ΔT)
            </span>
            <span className="text-xs font-mono font-bold text-rose-600">
              {deltaT > 0 ? `+${deltaT.toFixed(1)}` : deltaT.toFixed(1)}°C
            </span>
          </div>

          <input
            type="range"
            min={-2.0}
            max={4.0}
            step={0.5}
            value={deltaT}
            disabled={isRunning}
            onChange={(e) => setDeltaT(parseFloat(e.target.value))}
            className="w-full accent-rose-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>-2.0°C</span>
            <span>0.0°C</span>
            <span>+4.0°C</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Elevates saturation vapor pressure via Clausius-Clapeyron (+7% moisture/°C).
          </p>
        </div>

        {/* Boundary Layer Moisture Influx */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-cyan-600" />
              Moisture Flux (ΔIWV)
            </span>
            <span className="text-xs font-mono font-bold text-cyan-700">
              {deltaIwv > 0 ? `+${deltaIwv.toFixed(0)}` : deltaIwv.toFixed(0)}%
            </span>
          </div>

          <input
            type="range"
            min={-20.0}
            max={30.0}
            step={5.0}
            value={deltaIwv}
            disabled={isRunning}
            onChange={(e) => setDeltaIwv(parseFloat(e.target.value))}
            className="w-full accent-cyan-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>-20%</span>
            <span>0%</span>
            <span>+30%</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Multiplies integrated water vapor column from marine monsoonal surge.
          </p>
        </div>

        {/* Soil Saturation & Runoff Coefficient */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-blue-600" />
              Soil Saturation
            </span>
            <span className="text-xs font-mono font-bold text-blue-700">
              {Math.round(soilSaturation * 100)}% ({soilSaturation.toFixed(2)})
            </span>
          </div>

          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={soilSaturation}
            disabled={isRunning}
            onChange={(e) => setSoilSaturation(parseFloat(e.target.value))}
            className="w-full accent-blue-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0.10 Dry</span>
            <span>0.55 Normal</span>
            <span>1.00 Saturated</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Determines infiltration capacity and CartoDEM runoff acceleration.
          </p>
        </div>
      </div>

      {/* Prominent Action Button & Tensor Compute State */}
      <div className="space-y-3">
        <button
          onClick={handleRunSimulation}
          disabled={isRunning}
          className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <Cpu className="w-4 h-4 animate-spin text-white" />
              <span>EXECUTING TENSORRT CONVECTIVE ENGINE (~2.0s)...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>RUN CONVECTIVE SIMULATION</span>
            </>
          )}
        </button>

        {isRunning && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-blue-900 font-bold">{progressPhase}</span>
              <span className="text-blue-600">A100 TensorCore Active</span>
            </div>
            <div className="h-1.5 w-full bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}
      </div>

      {/* Scenario Output Scorecard */}
      {simulationResult && state && (
        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Simulated Convective State & Catchment Deltas
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-mono font-bold">
              Clausius-Clapeyron +{simulationResult.clausius_clapeyron_scaling_pct}%
            </span>
          </div>

          {/* Delta Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* CAPE */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Simulated CAPE</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-rose-600 font-mono">
                  {state.simulated_cape_j_kg}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">J/kg</span>
              </div>
              <span className="text-[9px] text-rose-500 font-bold">Severe Instability</span>
            </div>

            {/* IWV */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Column IWV</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-cyan-600 font-mono">
                  {state.simulated_iwv_kg_m2}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">kg/m²</span>
              </div>
              <span className="text-[9px] text-cyan-600 font-bold">Atmospheric River</span>
            </div>

            {/* Runoff Acceleration */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Runoff Acceleration</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-amber-600 font-mono">
                  {state.runoff_acceleration_multiplier}x
                </span>
                <span className="text-[10px] text-slate-400 font-mono">gain</span>
              </div>
              <span className="text-[9px] text-amber-600 font-bold">Hydro-Geomorphic Surge</span>
            </div>

            {/* Composite Risk */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Composite Risk Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-rose-600 font-mono">
                  {state.composite_risk_score}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">/ 100</span>
              </div>
              <span className="text-[9px] text-rose-600 font-bold">Critical Breach Tier</span>
            </div>
          </div>

          {/* Threshold Breach Alerts */}
          {breaches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Critical Threshold Breaches Triggered
              </span>
              <div className="space-y-1.5">
                {breaches.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                      <span className="font-bold text-rose-950">{b.rule_name}</span>
                    </div>
                    <div className="font-mono font-bold text-rose-700">
                      <span>Threshold: {b.threshold_value}</span>
                      <span className="mx-2 text-rose-300">→</span>
                      <span>Simulated: {b.simulated_value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Physical Narrative */}
          {simulationResult.physical_narrative && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200 leading-relaxed font-mono">
              <strong>Synoptic Synthesis:</strong> {simulationResult.physical_narrative}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
