import React, { useEffect } from 'react';
import { useWeatherStore } from '../store/useWeatherStore';
import { telemetryData } from '../data/telemetryData';
import { Sliders, MapPin, RotateCcw } from 'lucide-react';
import ParameterSliders from '../components/Simulator/ParametersSliders.jsx';
import RiskComparisionCanvas from '../components/Simulator/RiskComparisionCanvas';
import SimulatorChat from '../components/Simulator/SimulatorChat';

export const SimulatorPage = () => {
  const selectedRegion = useWeatherStore((state) => state.selectedRegion);
  const currentRiskData = useWeatherStore((state) => state.currentRiskData);
  const isLoading = useWeatherStore((state) => state.isLoading);
  const syncSimulatorToRegionTelemetry = useWeatherStore((state) => state.syncSimulatorToRegionTelemetry);
  const resetSimulatorParameters = useWeatherStore((state) => state.resetSimulatorParameters);
  const setStreamPaused = useWeatherStore((state) => state.setStreamPaused);

  useEffect(() => {
    setStreamPaused(true);
    return () => setStreamPaused(false);
  }, [setStreamPaused]);

  useEffect(() => {
    if (selectedRegion && telemetryData[selectedRegion.id]?.current) {
      syncSimulatorToRegionTelemetry(telemetryData[selectedRegion.id].current);
    }
  }, [selectedRegion, syncSimulatorToRegionTelemetry]);

  if (!selectedRegion) {
    return (
      <div className="p-6 text-sm text-slate-500 bg-slate-50 min-h-screen">
        Select a region to run the simulator.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 h-full overflow-y-auto text-slate-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-600 shadow-sm">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">What-If Convective Scenario Simulator</h1>
            <p className="text-xs text-slate-500">
              Adjust micro-telemetry atmospheric parameters to observe real-time convective model sensitivities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetSimulatorParameters}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs text-xs font-semibold text-slate-700 transition-all cursor-pointer active:scale-95"
            title="Reset parameters to regional baseline"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset to Baseline</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-slate-700">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Target: <strong>{selectedRegion.name}, {selectedRegion.state}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ParameterSliders />
          <SimulatorChat riskData={currentRiskData} />
        </div>
        <RiskComparisionCanvas riskData={currentRiskData} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default SimulatorPage;