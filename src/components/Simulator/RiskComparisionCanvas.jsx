import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Zap,
  Droplets,
  Mountain,
  ThermometerSnowflake,
  FileText,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { calculateFeatureAttributions } from '../../utils/xaiAttribution';
import { useWeatherStore } from '../../store/useWeatherStore';

export const RiskComparisionCanvas = ({ riskData, isLoading }) => {
  const simulatorParameters = useWeatherStore((state) => state.simulatorParameters);
  const riskScore = riskData?.riskScore ?? 0;
  const hazardType = riskData?.hazardType || 'Low Risk';
  const confidence = riskData?.confidence ? (riskData.confidence * 100).toFixed(0) : '--';

  // Dynamic XAI Feature Attribution & Narrative coupling
  const xaiResult = useMemo(() => {
    return calculateFeatureAttributions(simulatorParameters);
  }, [simulatorParameters]);

  const { attributions, dominantDriver, narrative } = xaiResult;

  const comparisonData = [
    { metric: 'Baseline', score: 25 },
    { metric: 'Simulated', score: riskScore },
  ];

  const attributionChartData = useMemo(() => {
    return attributions.map((a) => ({
      feature: a.name,
      percentage: a.percentage,
      color: a.color,
      dataset: a.dataset,
    }));
  }, [attributions]);

  const getIcon = (id) => {
    switch (id) {
      case 'iwv': return Droplets;
      case 'buoyancy': return Zap;
      case 'slope': return Mountain;
      case 'updraft': return ThermometerSnowflake;
      default: return Activity;
    }
  };

  return (
    <div className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-blue-900">
              Running Neural Inference...
            </span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Simulation Impact Visualizer</h3>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          Model Confidence: {confidence}%
        </span>
      </div>

      {/* Output Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Baseline Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Baseline Output
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-slate-800">25 / 100</div>
          <div className="text-xs text-emerald-600 font-semibold">Normal Operating Limits</div>
        </div>

        {/* Simulated Output Card */}
        <div className={`p-4 rounded-xl border space-y-2 ${
          riskScore > 70 
            ? 'bg-rose-50 border-rose-200 text-rose-900' 
            : riskScore > 40 
            ? 'bg-amber-50 border-amber-200 text-amber-900' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              Simulated Forecast
            </span>
            {riskScore > 70 ? (
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="text-3xl font-black">{riskScore} / 100</div>
          <div className="text-xs font-bold">{hazardType}</div>
        </div>
      </div>

      {/* Recharts Visual Comparison */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 font-semibold">Baseline vs. Simulation Variance</div>
        <div className="h-44 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="metric" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: '#2563eb' }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                <Cell fill="#3b82f6" />
                <Cell fill={riskScore > 70 ? '#f43f5e' : riskScore > 40 ? '#f59e0b' : '#10b981'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dynamic Diagnostic XAI Briefing / Narrative */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-purple-600">
            <FileText className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Diagnostic XAI Briefing (Dynamic Synthesis)
            </h4>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono font-bold border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Top Driver: {dominantDriver.name} ({dominantDriver.percentage}%)</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-700 bg-purple-50/70 rounded-xl p-3.5 border border-purple-100 font-sans">
          {narrative}
        </p>
      </div>

      {/* Dynamic 4-Catalyst Feature Attribution Cards */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Catalyst Sensitivity Attribution (Sum = 100%)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Integrated Gradients / SHAP Proxy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attributions.map((cat) => {
            const Icon = getIcon(cat.id);
            return (
              <div
                key={cat.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  cat.isDominant
                    ? 'border-purple-300 ring-2 ring-purple-100 bg-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${cat.lightBg}`}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block leading-tight">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cat.dataset}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                      cat.isDominant
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.percentage}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs mt-2 font-mono">
                  <span className="text-[11px] text-slate-500">Live Parameter:</span>
                  <span className="font-bold text-slate-800">{cat.value}</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Attribution Horizontal Bar Chart */}
      <div className="space-y-2 pt-1">
        <div className="h-40 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={attributionChartData}
              margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" domain={[0, 60]} unit="%" stroke="#64748b" fontSize={10} />
              <YAxis
                dataKey="feature"
                type="category"
                stroke="#64748b"
                fontSize={10}
                width={140}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                formatter={(val) => [`${val}%`, 'Attribution Weight']}
              />
              <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                {attributionChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default RiskComparisionCanvas;