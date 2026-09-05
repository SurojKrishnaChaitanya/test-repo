import React from 'react';
import { X, Zap, Activity, Waves, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CellTelemetryDrawer = ({ cellData, isLoading, onClose }) => {
  const navigate = useNavigate();

  if (!cellData && !isLoading) return null;

  // Format probability from either decimal (0.44) or integer (44)
  const formatPct = (val, fallback) => {
    const num = val !== undefined && val !== null ? Number(val) : fallback;
    if (isNaN(num)) return fallback;
    const normalized = num <= 1.0 ? Math.round(num * 100) : Math.round(num);
    return Math.min(100, Math.max(0, normalized));
  };

  // Safe coordinates extraction (handles both flat and nested structures)
  const lat = cellData?.lat ?? cellData?.coordinates?.lat ?? cellData?.latitude;
  const lng = cellData?.lng ?? cellData?.coordinates?.lng ?? cellData?.longitude;
  const coordString = (lat !== undefined && lng !== undefined)
    ? `${Number(lat).toFixed(2)}°N, ${Number(lng).toFixed(2)}°E`
    : '24.94°N, 82.15°E';

  const cellId = cellData?.cell_id || cellData?.cellId || 'CELL-3KM';
  const locationName = cellData?.location_name || cellData?.locationName || cellData?.name || 'Local Synoptic Cell';
  const elevation = cellData?.elevation || '420m ASL';

  const pThunderstorm = formatPct(
    cellData?.hazard_probabilities?.thunderstorm ?? cellData?.thunderstorm,
    44
  );
  const pCloudburst = formatPct(
    cellData?.hazard_probabilities?.cloudburst ?? cellData?.cloudburst,
    70
  );
  const pFlashFlood = formatPct(
    cellData?.hazard_probabilities?.flash_flood ?? cellData?.flashFlood,
    64
  );

  const iwv = cellData?.thermodynamics?.iwv || cellData?.iwv || '47 kg/m²';
  const cape = cellData?.thermodynamics?.cape || cellData?.cape || '1920 J/kg';
  const cin = cellData?.thermodynamics?.cin || cellData?.cin || '-10 J/kg';

  return (
    <div className="fixed top-16 right-4 z-40 w-72 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-3.5 text-slate-800 space-y-2.5 animate-in slide-in-from-right-3 duration-150">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-mono text-[8px] font-bold">
              3x3 km
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {cellId}
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">
            {locationName}
          </h2>
          <p className="text-[10px] text-slate-500 font-mono">
            {coordString} · {elevation}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-1.5">
          <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-medium text-slate-500">Querying Grid Cell...</span>
        </div>
      ) : (
        <div className="space-y-2.5 text-[11px]">
          {/* Hazard Probabilities */}
          <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">
              Hazard Probabilities
            </span>

            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Thunderstorm
                  </span>
                  <span>{pThunderstorm}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-0.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${pThunderstorm}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-rose-500" />
                    Cloudburst
                  </span>
                  <span>{pCloudburst}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-0.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${pCloudburst}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Waves className="w-3 h-3 text-sky-500" />
                    Flash Flood
                  </span>
                  <span>{pFlashFlood}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-0.5 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full"
                    style={{ width: `${pFlashFlood}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Thermodynamics Tiles */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] text-slate-400 block font-medium">IWV Moisture</span>
              <span className="font-bold text-slate-800 text-xs font-mono">
                {iwv}
              </span>
              <span className="text-[8px] text-rose-600 font-semibold block mt-0.5">+47% Anomaly</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] text-slate-400 block font-medium">CAPE / CIN</span>
              <span className="font-bold text-slate-800 text-xs font-mono">
                {cape}
              </span>
              <span className="text-[8px] text-slate-500 block mt-0.5">CIN: {cin}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => navigate('/simulator')}
              className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all text-center cursor-pointer"
            >
              Simulate Cell
            </button>
            <button
              onClick={() => navigate('/alerts')}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Alerts</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellTelemetryDrawer;