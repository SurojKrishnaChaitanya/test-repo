import React, { useState } from 'react';
import { Bell, Settings, Cpu, ShieldAlert } from 'lucide-react';
import { useWeatherStore } from '../../store/useWeatherStore';
import SystemVitalsWidget from '../telemetry/SystemVitalsWidget';
import EmergencyAlertModal from '../alerts/EmergencyAlertModal';

export default function Header({ activeAlertCount = 1 }) {
  const isConnectedToWS = useWeatherStore((state) => state.isConnectedToWS);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 relative"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backgroundImage: 'radial-gradient(rgba(14, 165, 233, 0.2) 1.5px, transparent 1.5px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search region, coordinates..."
          className="w-72 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* System Vitals HUD Quick Toggle */}
        <button
          onClick={() => setIsVitalsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-50/70 hover:bg-cyan-100/80 text-cyan-900 text-xs font-mono font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          title="Inspect Compute Node & Triton Telemetry"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-700" />
          <span>A100 MIG · 4.2GB VRAM · 1.6s</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* NDMA Alert Center Subscription Trigger */}
        <button
          onClick={() => setIsAlertModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100/80 text-rose-800 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          title="NDMA Emergency Alert Center & Broadcaster"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          <span>Alert Center</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
        </button>

        {/* Live-connection badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
            isConnectedToWS
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-100 text-slate-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isConnectedToWS ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
          {isConnectedToWS ? 'Live Nowcast' : 'Disconnected'}
        </div>

        <button
          onClick={() => setIsAlertModalOpen(true)}
          aria-label="Notifications"
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
        >
          <Bell className="h-5 w-5" />
          {activeAlertCount > 0 && (
            <>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 rounded-full bg-red-400 opacity-75 animate-ping"></span>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {activeAlertCount}
              </span>
            </>
          )}
        </button>
        <button
          aria-label="Settings"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-50"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Floating System Vitals HUD Modal */}
      <SystemVitalsWidget
        isOpen={isVitalsOpen}
        onClose={() => setIsVitalsOpen(false)}
      />

      {/* Emergency Alert Subscription & CAP v1.2 Preview Modal */}
      <EmergencyAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      />
    </header>
  );
}