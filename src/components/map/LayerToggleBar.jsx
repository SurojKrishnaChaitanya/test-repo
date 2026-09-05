import React from 'react';
import { Layers, Droplets, Zap, ThermometerSnowflake, Waves } from 'lucide-react';

const PHYSICAL_LAYERS = [
  { id: 'composite', label: 'Composite Risk', icon: Layers },
  { id: 'iwv', label: 'IWV Moisture', icon: Droplets },
  { id: 'cape', label: 'CAPE Instability', icon: Zap },
  { id: 'cttDrop', label: 'CTT Drop Rate', icon: ThermometerSnowflake },
  { id: 'drainage', label: 'Runoff Drainage', icon: Waves },
];

export const LayerToggleBar = ({ activeLayer = 'composite', onLayerChange }) => {
  return (
    <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-md">
      {PHYSICAL_LAYERS.map((layer) => {
        const Icon = layer.icon;
        const isActive = activeLayer === layer.id;
        return (
          <button
            key={layer.id}
            onClick={() => onLayerChange(layer.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LayerToggleBar;