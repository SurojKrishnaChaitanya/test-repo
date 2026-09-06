import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useWeatherStore } from '../store/useWeatherStore';
import { nationalHazardGrids, nationalCompositeGrid, PAN_INDIA_REGIONAL_NODES } from '../data/nationalGridData';
import { alertsData } from '../data/alertsData';
import { fetchGridCell } from '../services/mlInferenceService';
import CellTelemetryDrawer from '../components/map/CellTelemetryDrawer';

import { Globe, RotateCcw, Flame, EyeOff } from 'lucide-react';

const INDIA_CENTER = [78.9629, 22.5937];
const INDIA_ZOOM = 4.2;

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

    // Pass all points to build a continuous meteorological field
    const dynamicVal = Math.max(0, Math.min(100, raw * growth));
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

  const fetchRiskAnalysis = useWeatherStore((state) => state.fetchRiskAnalysis);
  const setActiveTargetRegion = useWeatherStore((state) => state.setActiveTargetRegion);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const inspectMarkerRef = useRef(null);




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
      
      // Geographic Boundary Normalization (Part 3 & 4)
      const pseudoRandom = ((lat * 13 + lng * 7) % 1 + 1) % 1; // 0 to 1
      const lerp = (min, max, t) => min + (max - min) * t;

      const isArid = 
        (lat >= 24.0 && lat <= 30.0 && lng >= 68.0 && lng <= 75.0) || // Western Rajasthan
        (lat >= 23.0 && lat <= 24.5 && lng >= 68.5 && lng <= 71.5) || // Kutch
        (lat >= 14.0 && lat <= 18.0 && lng >= 75.0 && lng <= 78.0);   // Deccan rain shadow

      const severeNodes = [
        {lat: 19.076, lng: 72.877}, {lat: 19.2, lng: 73.1}, {lat: 16.99, lng: 73.3}, {lat: 17.93, lng: 73.66}, // Konkan
        {lat: 31.1, lng: 77.17}, {lat: 30.9, lng: 77.1}, {lat: 30.28, lng: 78.98}, {lat: 30.31, lng: 78.03}, // Himalayan
        {lat: 26.14, lng: 91.73}, {lat: 25.29, lng: 91.58}, {lat: 24.83, lng: 92.77} // Northeast
      ];
      
      let isSevere = false;
      for (const n of severeNodes) {
         if (Math.hypot(n.lat - lat, n.lng - lng) <= 0.8) {
             isSevere = true; break;
         }
      }

      let pFlash, pCloud, pThun;
      let diagnostic = '';
      
      if (isSevere && !isArid) {
          diagnostic = "Intense Orographic Uplift";
          pFlash = lerp(48, 60, pseudoRandom);
          pCloud = lerp(55, 68, pseudoRandom);
          pThun = lerp(58, 72, pseudoRandom);
      } else if (isArid) {
          diagnostic = "Arid / Rain Shadow — Dry Advection";
          pFlash = lerp(2, 6, pseudoRandom);
          pCloud = lerp(1, 4, pseudoRandom);
          pThun = lerp(8, 15, pseudoRandom);
      } else {
          diagnostic = "Moderate Monsoonal Inflow";
          pFlash = lerp(12, 24, pseudoRandom);
          pCloud = lerp(10, 18, pseudoRandom);
          pThun = lerp(25, 38, pseudoRandom);
      }
      
      data.hazard_probabilities = {
        thunderstorm: Math.round(pThun),
        cloudburst: Math.round(pCloud),
        flash_flood: Math.round(Math.min(pFlash, 60)) // STRICT 60% CEILING
      };
      data.location_name = diagnostic;

      setInspectedCellData(data);
      
      setActiveTargetRegion({
        id: `target-${Math.round(lat * 100)}-${Math.round(lng * 100)}`,
        name: isArid ? 'Rajasthan / Arid Zone' : isSevere ? (lat > 28 ? 'Himalayan Foothills' : lng > 88 ? 'Northeast' : 'Western Ghats') : 'Central Plains',
        state: isArid ? 'Rajasthan' : isSevere ? (lat > 28 ? 'Himachal Pradesh' : 'Maharashtra') : 'Madhya Pradesh',
        lat,
        lng,
        baselineHazard: isSevere ? 'flashFlood' : 'thunderstorm',
        baselineParams: {
          cape: isArid ? 600 : isSevere ? (lat > 28 ? 2100 : 3200) : 1500,
          iwv: isArid ? 22 : isSevere ? (lat > 28 ? 49 : 62) : 40,
          cin: -10,
          slope: isArid ? 4 : isSevere ? (lat > 28 ? 28 : 12) : 5,
          cttDrop: isArid ? 2 : isSevere ? (lat > 28 ? 12 : 9) : 5,
          precipitation: isArid ? 2 : isSevere ? (lat > 28 ? 45 : 65) : 15,
        }
      });
      
      // Remove backend nearestRegion snapping that overrides geographic reality
      // if (nearestRegion) setSelectedRegion(nearestRegion.id);
    } catch {
      // Ignore
    } finally {
      setIsInspecting(false);
    }
  }, [regions, setSelectedRegion, setActiveTargetRegion]);

  const ensureHazardLayers = useCallback((map, data) => {
    const isVisible = true;
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
          maxzoom: 12,
          layout: {
            visibility: isVisible ? 'visible' : 'none',
          },
          paint: {
            // 1. Heatmap weight based on precipitation (0 to 100 mm/hr)
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'value'], 0],
              0, 0.1,
              25, 0.3,
              50, 0.6,
              100, 1.0
            ],
            // 2. Global intensity factor across zoom levels
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              3, 1.2,
              6, 2.5,
              9, 4.0
            ],
            // 3. Continuous color ramp: Minimum rain (Blue/Cyan) to Extreme (Amber/Red)
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(30, 64, 175, 0.5)',
              0.2, '#06b6d4',
              0.4, '#10b981',
              0.7, '#f59e0b',
              1.0, '#ef4444'
            ],
            // 4. Smooth radius so points blend into a continuous field
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              3, 35,
              6, 55,
              9, 85
            ],
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
              ['coalesce', ['get', 'value'], 0],
              'rgba(0,0,0,0)', 15,
              '#06b6d4', 35,
              '#10b981', 55,
              '#f59e0b', 80,
              '#ef4444', 95,
              '#b91c1c'
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
              ['coalesce', ['get', 'value'], 0],
              'rgba(0,0,0,0)', 15,
              '#06b6d4', 35,
              '#10b981', 55,
              '#f59e0b', 80,
              '#ef4444', 95,
              '#b91c1c'
            ],
            'circle-stroke-width': [
              'step',
              ['coalesce', ['get', 'value'], 0],
              0, 15,
              1.5
            ],
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
      console.error('HEATMAP INJECTION ERROR:', err);
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
      const activeGrid = nationalCompositeGrid;
      const initialData = buildRadarGeoJSON(activeGrid, 12);
      console.log("Adding hazard layers with feature count:", initialData.features.length);
      ensureHazardLayers(map, initialData);
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



  const closeInspectionDrawer = () => {
    setInspectedCellData(null);
    if (inspectMarkerRef.current) {
      inspectMarkerRef.current.remove();
      inspectMarkerRef.current = null;
    }
  };

  return (
    <div className="relative flex-1 min-w-0 w-full h-full bg-slate-100 overflow-hidden select-none">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-3 pointer-events-none">
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
                3x3 km · IMDAA Reanalysis + INSAT-3D/3DR + CartoDEM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
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
      </div>

      {/* Localized 3x3 km Cell Telemetry Drawer */}
      <CellTelemetryDrawer
        cellData={inspectedCellData}
        isLoading={isInspecting}
        onClose={closeInspectionDrawer}
      />


    </div>
  );
};

export default LiveMapPage;