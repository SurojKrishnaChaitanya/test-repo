import React, { useEffect } from 'react';
import { useWeatherStore } from '../store/useWeatherStore';
import { Activity, Zap, CloudRain, Wind, Info, Layers, Clock } from 'lucide-react';
import PublicSafetyAdvisory from '../components/shared/PublicSafetyAdvisory';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts';

const CustomTooltip = ({ active, payload, label, themeHex }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-200 text-xs space-y-1">
        <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
          Forecast {label}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeHex }} />
          <span className="font-black text-slate-900 text-sm">
            {payload[0].value} <span className="text-slate-500 font-medium text-xs">mm/h Precip</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const RiskAnalysisPage = () => {
  const activeTarget = useWeatherStore((state) => state.selectedRegion || state.activeTargetRegion || state.selectedCell);
  const currentRiskData = useWeatherStore((state) => state.currentRiskData);
  const isLoading = useWeatherStore((state) => state.isLoading);
  const fetchRiskAnalysis = useWeatherStore((state) => state.fetchRiskAnalysis);

  useEffect(() => {
    if (activeTarget) fetchRiskAnalysis();
  }, [activeTarget?.id, fetchRiskAnalysis]);

  if (!activeTarget) {
    return <div className="p-6 text-sm text-slate-500 bg-slate-50 min-h-screen">Select a region to view risk analysis.</div>;
  }

  const riskData = currentRiskData || { 
    riskScore: activeTarget.riskScore || activeTarget.baselineHazard === 'flashFlood' ? 80 : 30, 
    hazardType: activeTarget.hazardType || activeTarget.baselineHazard, 
    confidence: 0.85 
  };
  const hourlyTrend = riskData.hourlyTrend || riskData.hourly_trend || [];
  const metrics = riskData.metrics || riskData.telemetry_observed || {};
  const effectiveRiskScore = Number(riskData.riskScore ?? riskData.risk_score ?? activeTarget.riskScore ?? 75);

  // Extract or calculate numeric precipitation rate (mm/h)
  const rawPrecipStr = metrics.precipitationRate || metrics.precipitation_rate || '';
  const parsedPrecip = typeof rawPrecipStr === 'string' ? parseFloat(rawPrecipStr.replace(/[^0-9.]/g, '')) : Number(rawPrecipStr);
  const currentPrecip = !isNaN(parsedPrecip) && parsedPrecip > 0
    ? Math.round(parsedPrecip)
    : activeTarget.baselineParams?.precipitation || Math.round((effectiveRiskScore / 100) * 85 + 10);

  const rawFeatureImportance = riskData.featureImportance || riskData.feature_importance || [];
  const featureImportance = rawFeatureImportance.map(f => ({
    ...f,
    impact: currentPrecip < 15 ? Math.round(f.impact * 0.2) : f.impact
  }));

  // Precipitation theme styling
  const getPrecipTheme = (rate) => {
    if (rate >= 70) return { text: 'text-rose-600', badge: 'bg-rose-500', hex: '#e11d48', label: 'Torrential / Cloudburst' };
    if (rate >= 35) return { text: 'text-amber-600', badge: 'bg-amber-500', hex: '#d97706', label: 'Heavy Convective' };
    return { text: 'text-sky-600', badge: 'bg-sky-500', hex: '#0284c7', label: 'Moderate Rainfall' };
  };

  const theme = getPrecipTheme(currentPrecip);

  // Map hourly trend from risk scale to physical precipitation (mm/h)
  const chartData = hourlyTrend.map((pt) => {
    const maxVal = Math.max(10, currentPrecip * 1.5);
    const mmPerHour = Math.round((pt.risk / 100) * maxVal);
    return {
      time: `+${pt.hour}h`,
      precipitation: mmPerHour,
    };
  });

  // Precipitation Tooltip for Recharts


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 h-full overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">XAI Nowcasting Engine</span>
            {isLoading && <span className="text-xs text-amber-600 font-semibold animate-pulse">• Running ML Inference...</span>}
          </div>
          <h1 className="text-2xl font-black text-slate-900">{activeTarget?.name || 'National Composite'} — Convective Nowcast</h1>
          <p className="text-xs text-slate-500">
            {activeTarget?.state || 'Pan-India'} • +1h to +6h Window • Model Confidence: {((riskData.confidence ?? riskData.model_confidence ?? 0.85) * 100).toFixed(1)}%
          </p>
        </div>
        <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white ${theme.badge} shadow-sm uppercase`}>
          {theme.label}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Replaced Risk Score with Precipitation Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">Precipitation Rate</span>
            <CloudRain className={`w-5 h-5 ${theme.text}`} />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black font-mono ${theme.text}`}>{currentPrecip}</span>
              <span className="text-slate-400 font-bold text-sm">mm/h</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div className={`h-full ${theme.badge}`} style={{ width: `${Math.min(100, (currentPrecip / 120) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">Primary Hazard</span>
            <CloudRain className="w-5 h-5 text-sky-500" />
          </div>
          <div className="mt-4">
            <span className="text-xl font-black text-slate-900 capitalize">
              {currentPrecip < 15 ? 'Low Convective Risk' : (riskData.hazardType || riskData.hazard_type || 'Thunderstorm').replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Intensity: <strong className="text-slate-700">{currentPrecip < 15 ? 'Stable' : (metrics.precipitationRate || metrics.precipitation_rate || `${currentPrecip} mm/h`)}</strong></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">IWV Moisture</span>
            <Activity className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4">
            <span className="text-xl font-black text-slate-900 font-mono">{metrics.iwvMoisture || activeTarget?.baselineParams?.iwv || 40} kg/m²</span>
            <p className="text-[11px] text-slate-500 mt-1">CAPE: <strong className="text-slate-700">{metrics.cape || activeTarget?.baselineParams?.cape || 1500} J/kg</strong></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">Wind / CTT</span>
            <Wind className="w-5 h-5 text-teal-500" />
          </div>
          <div className="mt-4">
            <span className="text-xl font-black text-slate-900 font-mono">{metrics.windSpeed || metrics.wind_speed || '34 km/h'}</span>
            <p className="text-[11px] text-slate-500 mt-1">CTT Drop: <strong className="text-slate-700">{metrics.cttDropRate || metrics.ctt_drop_rate || '-9°C/30min'}</strong></p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Precipitation Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-900">+1h to +6h Nowcast Window</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Precipitation Trajectory (mm/h)
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 25, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="nowcastPrecipGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.hex} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={theme.hex} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={12}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  domain={[0, 'dataMax + 15']}
                  unit=" mm/h"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip themeHex={theme.hex} />} />
                <Area
                  type="monotone"
                  dataKey="precipitation"
                  stroke={theme.hex}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#nowcastPrecipGrad)"
                  dot={{
                    r: 4.5,
                    fill: '#ffffff',
                    stroke: theme.hex,
                    strokeWidth: 2.5,
                  }}
                  activeDot={{
                    r: 6.5,
                    fill: theme.hex,
                    stroke: '#ffffff',
                    strokeWidth: 2.5,
                  }}
                >
                  <LabelList
                    dataKey="precipitation"
                    position="top"
                    offset={10}
                    fill="#334155"
                    fontSize={11}
                    fontWeight={700}
                    formatter={(val) => `${val}`}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Impact List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Feature Impact</h2>
          </div>
          <div className="space-y-3.5 pt-1">
            {featureImportance.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>{item.feature}</span>
                  <span className={item.impact > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {item.impact > 0 ? `+${item.impact}` : item.impact}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.impact > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, Math.abs(item.impact) * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Insights Row (Light Theme) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Telemetry Feeds</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(metrics).map(([key, val]) => (
              <div key={key} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="font-bold text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        </div>
        <PublicSafetyAdvisory advisory={riskData.advisory} />
      </div>
    </div>
  );
};

export default RiskAnalysisPage;