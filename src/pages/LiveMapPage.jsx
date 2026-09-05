import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useWeatherStore } from '../store/useWeatherStore';
import { nationalHazardGrids, nationalCompositeGrid, PAN_INDIA_REGIONAL_NODES } from '../data/nationalGridData';
import { alertsData } from '../data/alertsData';
import { fetchGridCell } from '../services/mlInferenceService';
import CellTelemetryDrawer from '../components/map/CellTelemetryDrawer';
import TemporalPlaybackController from '../components/map/TemporalPlaybackController';
import { Globe, RotateCcw, Flame, EyeOff } from 'lucide-react';

const INDIA_CENTER = [78.9629, 22.5937];
const INDIA_ZOOM = 4.6;

const OSM_MAP_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-tiles-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }],
};

const HAZARD_TABS = [
  { id: 'all', label: 'All Hazards' },
  { id: 'thunderstorm', label: 'Thunderstorms' },
  { id: 'cloudburst', label: 'Cloudbursts' },
  { id: 'flashFlood', label: 'Flash Floods' },
];

function buildRadarGeoJSON(grid = [], frameIndex = 12) {
  const isPast = frameIndex <= 12;
  const growth = isPast
    ? 0.5 + (0.5 * (frameIndex / 12))
    : Math.max(0.4, 1.05 - ((frameIndex - 12) * 0.05));
  const driftLng = (frameIndex - 12) * 0.015;

  const features = [];
  const safeGrid = Array.isArray(grid) && grid.length > 0 ? grid : (nationalCompositeGrid || []);

  // 1. Ingest national grid points with significant convective intensity across India
  safeGrid.forEach((p) => {
    let raw = p.value || 0;
    // Highlight regional synoptic sectors across India
    if (raw < 15) {
      const isMonsoonZone =
        (p.lng >= 72 && p.lng <= 78 && p.lat >= 8 && p.lat <= 22) || // Western Ghats & Arabian Sea Inflow
        (p.lng >= 84 && p.lng <= 96 && p.lat >= 20 && p.lat <= 28) || // Bay of Bengal, Bengal & Northeast
        (p.lng >= 74 && p.lng <= 82 && p.lat >= 26 && p.lat <= 34);  // Himalayan Foothills & Indo-Gangetic
      if (isMonsoonZone) {
        raw = 35 + (Math.sin(p.lat * 3.5 + p.lng * 2.1) * 30);
      }
    }

    if (raw >= 18) {
      const dynamicVal = Math.min(100, Math.max(15, raw * growth));
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(p.lng) + driftLng, Number(p.lat)],
        },
        properties: {
          value: Math.round(dynamicVal),
          precipitation: Math.round(dynamicVal * 1.25),
        },
      });
    }
  });

  // 2. Ingest existing alert hotspots from alertsData
  if (Array.isArray(alertsData)) {
    alertsData.forEach((a) => {
      const val = Math.min(100, Math.max(30, (a.riskScore || 70) * growth));
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(a.lng) + driftLng, Number(a.lat)],
        },
        properties: {
          value: Math.round(val),
          precipitation: Math.round(val * 1.3),
          name: a.regionName,
          hazardType: a.hazardType,
        },
      });
    });
  }

  // 3. Ingest all pan-India regional simulation benchmark nodes
  PAN_INDIA_REGIONAL_NODES.forEach((storm) => {
    const val = Math.min(100, Math.max(25, storm.val * growth));
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(storm.lng) + driftLng, Number(storm.lat)],
      },
      properties: {
        value: Math.round(val),
        precipitation: Math.round(val * 1.35),
        name: storm.name,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

export const LiveMapPage = () => {
  const regions = useWeatherStore((state) => state.regions);
  const selectedRegion = useWeatherStore((state) => state.selectedRegion);
  const setSelectedRegion = useWeatherStore((state) => state.setSelectedRegion);
  const mapLayers = useWeatherStore((state) => state.mapLayers);
  const setActiveHazard = useWeatherStore((state) => state.setActiveHazard);
  const fetchRiskAnalysis = useWeatherStore((state) => state.fetchRiskAnalysis);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const inspectMarkerRef = useRef(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(600);

  const [inspectedCellData, setInspectedCellData] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);

  useEffect(() => {
    if (selectedRegion) fetchRiskAnalysis();
  }, [selectedRegion?.id, fetchRiskAnalysis]);

  const handleMapClick = useCallback(async (e) => {
    const { lng, lat } = e.lngLat;
    if (lat < 6.0 || lat > 38.0 || lng < 68.0 || lng > 98.0) return;

    setIsInspecting(true);

    const map = mapInstanceRef.current;
    if (map) {
      if (!inspectMarkerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <div style="position: absolute; width: 32px; height: 32px; border: 2px solid #0284c7; border-radius: 50%; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite; opacity: 0.6;"></div>
            <div style="position: absolute; width: 10px; height: 10px; background: #0284c7; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 8px rgba(2,132,199,0.7);"></div>
          </div>
        `;
        inspectMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        inspectMarkerRef.current.setLngLat([lng, lat]);
      }
    }

    let nearestRegion = null;
    let minDistance = Infinity;
    if (regions && regions.length > 0) {
      regions.forEach((r) => {
        const d = Math.hypot(r.lat - lat, r.lng - lng);
        if (d < minDistance) {
          minDistance = d;
          nearestRegion = r;
        }
      });
    }

    try {
      const data = await fetchGridCell(lat, lng);
      setInspectedCellData(data);
      if (nearestRegion) setSelectedRegion(nearestRegion.id);
    } catch {
      if (nearestRegion) setSelectedRegion(nearestRegion.id);
    } finally {
      setIsInspecting(false);
    }
  }, [regions, setSelectedRegion]);

  const showHeatmapRef = useRef(showHeatmap);
  useEffect(() => {
    showHeatmapRef.current = showHeatmap;
  }, [showHeatmap]);

  const ensureHazardLayers = useCallback((map, data, isVisible = showHeatmapRef.current) => {
    if (!map || !map.isStyleLoaded()) return;

    try {
      const existingSource = map.getSource('national-hazard-source');
      if (existingSource) {
        existingSource.setData(data);
      } else {
        map.addSource('national-hazard-source', {
          type: 'geojson',
          data: data,
        });
      }

      // 1. Native Heatmap Layer for continuous thermal/convective plumes
      if (!map.getLayer('convective-heatmap-layer')) {
        map.addLayer({
          id: 'convective-heatmap-layer',
          type: 'heatmap',
          source: 'national-hazard-source',
          layout: {
            visibility: isVisible ? 'visible' : 'none',
          },
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'value'], 0, 0, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.2, '#38bdf8',
              0.4, '#10b981',
              0.7, '#f59e0b',
              1.0, '#ef4444',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 16, 6, 36, 9, 64],
            'heatmap-opacity': 0.85,
          },
        });
      }

      // 2. Convective Radar Glow Layer for wide ambient node visibility
      if (!map.getLayer('convective-radar-glow')) {
        map.addLayer({
          id: 'convective-radar-glow',
          type: 'circle',
          source: 'national-hazard-source',
          layout: {
            visibility: isVisible ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              3, 14,
              6, 24,
              9, 36,
            ],
            'circle-color': [
              'step',
              ['get', 'value'],
              '#38bdf8', 25,
              '#10b981', 50,
              '#f59e0b', 70,
              '#ef4444',
            ],
            'circle-blur': 0.45,
            'circle-opacity': 0.65,
          },
        });
      }

      // 3. Convective Radar Storm Core Layer for pinpoint storm center identification
      if (!map.getLayer('convective-radar-core')) {
        map.addLayer({
          id: 'convective-radar-core',
          type: 'circle',
          source: 'national-hazard-source',
          layout: {
            visibility: isVisible ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              3, 5,
              6, 8,
              9, 12,
            ],
            'circle-color': [
              'step',
              ['get', 'value'],
              '#38bdf8', 25,
              '#10b981', 50,
              '#f59e0b', 70,
              '#ef4444',
            ],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1.0,
          },
        });
      }

      // Move all custom hazard layers above the base osm-tiles-layer raster layer
      if (map.getLayer('osm-tiles-layer')) {
        if (map.getLayer('convective-heatmap-layer')) map.moveLayer('convective-heatmap-layer');
        if (map.getLayer('convective-radar-glow')) map.moveLayer('convective-radar-glow');
        if (map.getLayer('convective-radar-core')) map.moveLayer('convective-radar-core');
      }

      const activeVis = isVisible ? 'visible' : 'none';
      if (map.getLayer('convective-heatmap-layer')) {
        map.setLayoutProperty('convective-heatmap-layer', 'visibility', activeVis);
      }
      if (map.getLayer('convective-radar-glow')) {
        map.setLayoutProperty('convective-radar-glow', 'visibility', activeVis);
      }
      if (map.getLayer('convective-radar-core')) {
        map.setLayoutProperty('convective-radar-core', 'visibility', activeVis);
      }

      map.triggerRepaint();
    } catch (err) {
      console.error('Failed to apply hazard layers:', err);
    }
  }, []);

  const handleMapClickRef = useRef(handleMapClick);
  useEffect(() => {
    handleMapClickRef.current = handleMapClick;
  }, [handleMapClick]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_MAP_STYLE,
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
    });

    window.__map = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapInstanceRef.current = map;

    const applyData = () => {
      if (!map.isStyleLoaded()) return;
      map.resize();
      const activeHazard = useWeatherStore.getState().mapLayers.activeHazard;
      const activeGrid = !activeHazard || activeHazard === 'all'
        ? nationalCompositeGrid
        : nationalHazardGrids[activeHazard] || nationalCompositeGrid;
      const initialData = buildRadarGeoJSON(activeGrid, 12);
      console.log("Adding hazard layers with feature count:", initialData.features.length);
      ensureHazardLayers(map, initialData, showHeatmapRef.current);
      map.triggerRepaint();
    };

    if (map.isStyleLoaded()) {
      applyData();
    }
    map.on('load', applyData);

    const handleStyleData = () => {
      if (!map.isStyleLoaded()) return;
      if (
        !map.getSource('national-hazard-source') ||
        !map.getLayer('convective-heatmap-layer') ||
        !map.getLayer('convective-radar-core')
      ) {
        applyData();
      }
    };
    map.on('styledata', handleStyleData);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const onMapClick = (e) => {
      handleMapClickRef.current?.(e);
    };
    map.on('click', onMapClick);

    return () => {
      resizeObserver.disconnect();
      map.off('click', onMapClick);
      map.off('load', applyData);
      map.off('styledata', handleStyleData);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      window.__map = null;
    };
  }, []); // Mount strictly once

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const update = () => {
      if (!map.isStyleLoaded()) return;
      const activeGrid = !mapLayers.activeHazard || mapLayers.activeHazard === 'all'
        ? nationalCompositeGrid
        : nationalHazardGrids[mapLayers.activeHazard] || nationalCompositeGrid;
      const geojsonData = buildRadarGeoJSON(activeGrid, currentFrame);

      ensureHazardLayers(map, geojsonData, showHeatmapRef.current);
      map.triggerRepaint();
    };

    if (map.isStyleLoaded()) update();
    else map.once('styledata', update);
  }, [mapLayers.activeHazard, currentFrame, ensureHazardLayers]);

  const handleToggleHeatmap = () => {
    const next = !showHeatmap;
    setShowHeatmap(next);
    showHeatmapRef.current = next;
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      const vis = next ? 'visible' : 'none';
      if (map.getLayer('convective-heatmap-layer')) map.setLayoutProperty('convective-heatmap-layer', 'visibility', vis);
      if (map.getLayer('convective-radar-glow')) map.setLayoutProperty('convective-radar-glow', 'visibility', vis);
      if (map.getLayer('convective-radar-core')) map.setLayoutProperty('convective-radar-core', 'visibility', vis);
      map.triggerRepaint();
    }
  };

  const closeInspectionDrawer = () => {
    setInspectedCellData(null);
    if (inspectMarkerRef.current) {
      inspectMarkerRef.current.remove();
      inspectMarkerRef.current = null;
    }
  };

  return (
    <div className="relative flex-1 min-w-0 w-full h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden select-none">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      {/* Top HUD Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-3 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-md pointer-events-auto">
            {HAZARD_TABS.map((tab) => {
              const isActive = (mapLayers.activeHazard || 'all') === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveHazard(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-header status and action controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-md pointer-events-auto flex items-center gap-3">
            <div className="p-1.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-600">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-slate-800">National Convective Nowcast</h1>
                <span className="px-1.5 py-0.5 rounded bg-sky-100 border border-sky-200 text-[9px] font-mono font-bold text-sky-700">
                  CLICK ANY CELL TO INSPECT
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                3x3 km · ERA5 Reanalysis + INSAT-3D/3DR + CartoDEM · 25-Frame Sequence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleToggleHeatmap}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer ${
                showHeatmap
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {showHeatmap ? <Flame className="w-3.5 h-3.5 text-white" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              <span>{showHeatmap ? 'Heatmap On' : 'Heatmap Off'}</span>
            </button>

            <button
              onClick={() => {
                setSelectedRegion(null);
                closeInspectionDrawer();
                mapInstanceRef.current?.flyTo({ center: INDIA_CENTER, zoom: INDIA_ZOOM });
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-sm text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
              <span>Reset Overview</span>
            </button>
          </div>
        </div>

        {/* Precipitation Legend Bar */}
        <div className="pointer-events-auto w-64 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-md space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-700">
            <span>Precipitation Rate</span>
            <span className="text-slate-500 font-mono">mm/hr</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 to-rose-600" />
          <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
            <span>0 mm</span>
            <span>25 mm</span>
            <span>50 mm</span>
            <span>75+ mm</span>
          </div>
        </div>
      </div>

      {/* Localized 3x3 km Cell Telemetry Drawer */}
      <CellTelemetryDrawer
        cellData={inspectedCellData}
        isLoading={isInspecting}
        onClose={closeInspectionDrawer}
      />

      {/* Bottom Dock: 25-Frame Temporal Playback Controller */}
      <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none">
        <TemporalPlaybackController
          currentFrame={currentFrame}
          onFrameChange={setCurrentFrame}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
        />
      </div>
    </div>
  );
};

export default LiveMapPage;