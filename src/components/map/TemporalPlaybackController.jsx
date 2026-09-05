import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const TEMPORAL_FRAMES = [
  { index: 0, label: 't-6.0h', type: 'observed' },
  { index: 1, label: 't-5.5h', type: 'observed' },
  { index: 2, label: 't-5.0h', type: 'observed' },
  { index: 3, label: 't-4.5h', type: 'observed' },
  { index: 4, label: 't-4.0h', type: 'observed' },
  { index: 5, label: 't-3.5h', type: 'observed' },
  { index: 6, label: 't-3.0h', type: 'observed' },
  { index: 7, label: 't-2.5h', type: 'observed' },
  { index: 8, label: 't-2.0h', type: 'observed' },
  { index: 9, label: 't-1.5h', type: 'observed' },
  { index: 10, label: 't-1.0h', type: 'observed' },
  { index: 11, label: 't-0.5h', type: 'observed' },
  { index: 12, label: 't-0.0h', type: 'anchor' },
  { index: 13, label: 't+0.5h', type: 'forecast' },
  { index: 14, label: 't+1.0h', type: 'forecast' },
  { index: 15, label: 't+1.5h', type: 'forecast' },
  { index: 16, label: 't+2.0h', type: 'forecast' },
  { index: 17, label: 't+2.5h', type: 'forecast' },
  { index: 18, label: 't+3.0h', type: 'forecast' },
  { index: 19, label: 't+3.5h', type: 'forecast' },
  { index: 20, label: 't+4.0h', type: 'forecast' },
  { index: 21, label: 't+4.5h', type: 'forecast' },
  { index: 22, label: 't+5.0h', type: 'forecast' },
  { index: 23, label: 't+5.5h', type: 'forecast' },
  { index: 24, label: 't+6.0h', type: 'forecast' },
];

export const TemporalPlaybackController = ({
  currentFrame = 12,
  onFrameChange,
  isPlaying = false,
  onTogglePlay,
  playbackSpeed = 600,
  onSpeedChange,
}) => {
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        onFrameChange((prev) => (prev >= 24 ? 0 : prev + 1));
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, onFrameChange]);

  const activeMeta = TEMPORAL_FRAMES[currentFrame] || TEMPORAL_FRAMES[12];

  return (
    <div className="w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2 pointer-events-auto text-slate-800">
      {/* Top Details Strip */}
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
            activeMeta.type === 'anchor'
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : activeMeta.type === 'observed'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-sky-100 text-sky-800 border border-sky-200'
          }`}>
            {activeMeta.label}
          </span>
          <span className="text-slate-600 font-medium">
            {activeMeta.type === 'anchor'
              ? 'Phase: Live Nowcast Initiation Boundary'
              : activeMeta.type === 'observed'
              ? 'Phase: Satellite / Radar Observation Ingest'
              : 'Phase: Deep Learning Convective Projection'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>13 Observed Frames (t-6h to t-0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>12 AI Nowcast Frames (t+0.5h to t+6h)</span>
          </div>
        </div>
      </div>

      {/* Discrete 25-Node Stepper Timeline Track */}
      <div className="relative py-2 px-1">
        {/* Continuous Track Bar */}
        <div className="relative w-full h-2 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-between px-1">
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-sky-500/20 rounded-full"
            style={{ width: `${(currentFrame / 24) * 100}%` }}
          />

          {/* 25 Individual Interactive Dots */}
          {TEMPORAL_FRAMES.map((f) => {
            const isCurrent = f.index === currentFrame;
            const isAnchor = f.index === 12;
            const isObserved = f.index < 12;

            return (
              <button
                key={f.index}
                onClick={() => onFrameChange(f.index)}
                title={f.label}
                className={`relative z-10 transition-all cursor-pointer rounded-full ${
                  isCurrent
                    ? 'w-4 h-4 bg-sky-600 ring-4 ring-sky-200 shadow-md scale-125'
                    : isAnchor
                    ? 'w-2.5 h-2.5 bg-rose-500 hover:scale-125'
                    : isObserved
                    ? 'w-2 h-2 bg-emerald-400 hover:bg-emerald-600'
                    : 'w-2 h-2 bg-sky-300 hover:bg-sky-500'
                }`}
              />
            );
          })}
        </div>

        {/* Time Stamp Tick Labels */}
        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 px-1">
          <span>t-6.0h</span>
          <span>t-3.0h</span>
          <span className="font-bold text-rose-600">t-0.0h</span>
          <span>t+3.0h</span>
          <span>t+6.0h</span>
        </div>
      </div>

      {/* Controls Strip */}
      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isPlaying ? 'Pause' : 'Play Nowcast Loop'}</span>
          </button>

          <button
            onClick={() => onFrameChange(12)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Real-Time (t-0)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-500">
            Frame <strong>{currentFrame + 1}</strong> / 25
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { label: '0.5x', speed: 1000 },
              { label: '1x', speed: 600 },
              { label: '2x', speed: 300 },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => onSpeedChange(s.speed)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  playbackSpeed === s.speed ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporalPlaybackController;