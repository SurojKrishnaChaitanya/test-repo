import React, { useEffect } from 'react';
import { useWeatherStore } from '../../store/useWeatherStore';
import { CloudRain, Wind, Droplets, Thermometer, Gauge, Zap, Mountain, RotateCcw } from 'lucide-react';

export const ParameterSliders = () => {
  const {
    simulatorParameters,
    setSimulatorParameters,
    resetSimulatorParameters,
    fetchRiskAnalysis,
    isLoading,
  } = useWeatherStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRiskAnalysis(simulatorParameters);
    }, 300);
    return () => clearTimeout(timer);
  }, [simulatorParameters, fetchRiskAnalysis]);

  const handleChange = (key, value) => setSimulatorParameters({ [key]: Number(value) });

  return (
    <div className="p-5 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Simulation Controls</h3>
          {isLoading && <span className="text-xs text-amber-600 font-semibold animate-pulse">• Executing Model...</span>}
        </div>

        <button
          type="button"
          onClick={resetSimulatorParameters}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
          title="Reset parameters to regional baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Baseline</span>
        </button>
      </div>

      <div className="space-y-4">
        <Slider
          icon={<Droplets className="w-4 h-4 text-cyan-600" />}
          label="Integrated Water Vapor (IWV Anomaly)"
          unit="kg/m²"
          min={10}
          max={90}
          value={simulatorParameters?.iwv ?? 45}
          onChange={(v) => handleChange('iwv', v)}
        />
        <Slider
          icon={<Zap className="w-4 h-4 text-rose-500" />}
          label="CAPE (Thermal Buoyancy)"
          unit="J/kg"
          min={200}
          max={4200}
          value={simulatorParameters?.cape ?? 1800}
          onChange={(v) => handleChange('cape', v)}
        />
        <Slider
          icon={<Gauge className="w-4 h-4 text-slate-600" />}
          label="CIN (Convective Inhibition)"
          unit="J/kg"
          min={-50}
          max={0}
          value={simulatorParameters?.cin ?? -15}
          onChange={(v) => handleChange('cin', v)}
        />
        <Slider
          icon={<Mountain className="w-4 h-4 text-amber-600" />}
          label="CartoDEM Slope Gradient (Orographic Gain)"
          unit="°"
          min={0}
          max={45}
          value={simulatorParameters?.slope ?? 18}
          onChange={(v) => handleChange('slope', v)}
        />
        <Slider
          icon={<Thermometer className="w-4 h-4 text-purple-600" />}
          label="INSAT-3D CTT Cooling Rate (Updraft)"
          unit="°C/30min"
          min={0}
          max={20}
          value={simulatorParameters?.cttDrop ?? 8}
          onChange={(v) => handleChange('cttDrop', v)}
        />
        <Slider
          icon={<CloudRain className="w-4 h-4 text-blue-600" />}
          label="Precipitation Rate"
          unit="mm/hr"
          min={0}
          max={150}
          value={simulatorParameters?.precipitation ?? 60}
          onChange={(v) => handleChange('precipitation', v)}
        />
        <Slider
          icon={<Wind className="w-4 h-4 text-teal-600" />}
          label="Kinematic Wind Speed"
          unit="km/h"
          min={0}
          max={160}
          value={simulatorParameters?.windSpeed ?? 40}
          onChange={(v) => handleChange('windSpeed', v)}
        />
      </div>
    </div>
  );
};

function Slider({ icon, label, unit, min, max, value, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
        <span className="flex items-center gap-1.5">{icon} {label}</span>
        <span className="font-mono text-blue-600 font-bold">{value} {unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full accent-blue-600 bg-slate-100 h-2 rounded-lg appearance-none cursor-pointer" 
      />
    </div>
  );
}

export default ParameterSliders;