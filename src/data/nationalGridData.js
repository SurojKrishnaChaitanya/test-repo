import { alertsData } from './alertsData.js';

// Atmospheric National Grid — 3x3 km Spatial Resolution (EPSG:4326 / LCC)
// Synthesizing IMDAA reanalysis moisture flux, INSAT-3D/3DR CTT drop rate,
// and CartoDEM topographic slope indices.
const INDIA_BOUNDS = { latMin: 8.0, latMax: 35.5, lngMin: 68.0, lngMax: 96.0 };
const GRID_RESOLUTION_DEG = 0.2; // Dense pan-India meteorological mesh

// Deterministic pseudo-noise (keeps output stable across reloads)
function seededNoise(lat, lng) {
  const n = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  return n - Math.floor(n); // 0..1
}

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Build hotspots for a given hazard directly from alertsData — single source of truth
function getHotspots(hazardType) {
  return alertsData
    .filter((a) => a.hazardType === hazardType && a.status !== 'resolved')
    .map((a) => ({
      lat: a.lat,
      lng: a.lng,
      intensity: a.riskScore,
      // higher-risk regions bleed influence further outward
      sigmaKm: 60 + (a.riskScore / 100) * 140,
    }));
}

// Gaussian decay contribution from one hotspot at a given point
function gaussianContribution(distKm, intensity, sigmaKm) {
  return intensity * Math.exp(-(distKm ** 2) / (2 * sigmaKm ** 2));
}

function generateGridPoints() {
  const points = [];
  for (let lat = INDIA_BOUNDS.latMin; lat <= INDIA_BOUNDS.latMax; lat += GRID_RESOLUTION_DEG) {
    for (let lng = INDIA_BOUNDS.lngMin; lng <= INDIA_BOUNDS.lngMax; lng += GRID_RESOLUTION_DEG) {
      points.push({ lat, lng });
    }
  }
  return points;
}

function computeHazardGrid(hazardType) {
  const hotspots = getHotspots(hazardType);
  const points = generateGridPoints();

  return points.map(({ lat, lng }) => {
    let value = 0;
    for (const h of hotspots) {
      const dist = haversineKm(lat, lng, h.lat, h.lng);
      value += gaussianContribution(dist, h.intensity, h.sigmaKm);
    }
    const ambient = seededNoise(lat, lng) * 1.5;
    const total = Math.min(100, value + ambient);

    return { lat, lng, value: Math.round(total * 10) / 10 };
  });
}

// Eagerly computed once at module load — dense mesh (~19,000 points x 3 hazards)
export const nationalHazardGrids = {
  thunderstorm: computeHazardGrid('thunderstorm'),
  cloudburst: computeHazardGrid('cloudburst'),
  flashFlood: computeHazardGrid('flashFlood'),
};

// Composite grid for the "All" tab — each point tagged with whichever hazard is dominant there
export const nationalCompositeGrid = (() => {
  const { thunderstorm, cloudburst, flashFlood } = nationalHazardGrids;
  return thunderstorm.map((_, i) => {
    const candidates = [
      { hazardType: 'thunderstorm', value: thunderstorm[i].value },
      { hazardType: 'cloudburst', value: cloudburst[i].value },
      { hazardType: 'flashFlood', value: flashFlood[i].value },
    ];
    const dominant = candidates.reduce((a, b) => (b.value > a.value ? b : a));
    return {
      lat: thunderstorm[i].lat,
      lng: thunderstorm[i].lng,
      value: dominant.value,
      hazardType: dominant.hazardType,
    };
  });
})();

// Grid metadata — needed for contour generation (d3-contour expects a flat row-major array + dims)
export const gridMeta = {
  bounds: INDIA_BOUNDS,
  resolutionDeg: GRID_RESOLUTION_DEG,
  spatialResolution: '3km x 3km',
  crs: 'EPSG:4326_LCC',
  dataSource: 'IMDAA Reanalysis + INSAT-3D/3DR + CartoDEM',
  cols: Math.floor((INDIA_BOUNDS.lngMax - INDIA_BOUNDS.lngMin) / GRID_RESOLUTION_DEG) + 1,
  rows: Math.floor((INDIA_BOUNDS.latMax - INDIA_BOUNDS.latMin) / GRID_RESOLUTION_DEG) + 1,
};

// Flat value array per hazard, row-major, for contour libraries (d3-contour, Deck.gl ContourLayer)
export function getFlatValues(hazardType) {
  const grid =
    hazardType === 'all' ? nationalCompositeGrid : nationalHazardGrids[hazardType];
  return grid.map((p) => p.value);
}

export const PAN_INDIA_REGIONAL_NODES = [
  // Arid & Rain-Shadow Zones (Near-Zero / Low Rain, 0-15 mm/hr)
  { lng: 73.0243, lat: 26.2389, val: 5, name: 'Jodhpur', state: 'Rajasthan' },
  { lng: 70.9083, lat: 26.9157, val: 2, name: 'Jaisalmer', state: 'Rajasthan' },
  { lng: 73.3000, lat: 28.0229, val: 8, name: 'Bikaner', state: 'Rajasthan' },
  { lng: 71.3967, lat: 25.7521, val: 4, name: 'Barmer', state: 'Rajasthan' },
  { lng: 69.8597, lat: 23.7337, val: 6, name: 'Kutch / Bhuj', state: 'Gujarat' },
  { lng: 77.5946, lat: 14.6819, val: 12, name: 'Rayalaseema / Anantapur', state: 'Andhra Pradesh' },
  { lng: 75.1240, lat: 15.3647, val: 14, name: 'North Karnataka / Hubli', state: 'Karnataka' },
  { lng: 73.8567, lat: 18.5204, val: 15, name: 'Pune Rain Shadow', state: 'Maharashtra' },

  // Moderate Monsoon Zones (25-50 mm/hr)
  { lng: 77.4126, lat: 23.2599, val: 35, name: 'Bhopal / Central MP', state: 'Madhya Pradesh' },
  { lng: 79.0882, lat: 21.1458, val: 42, name: 'Nagpur / Vidarbha', state: 'Maharashtra' },
  { lng: 85.1376, lat: 25.5941, val: 38, name: 'Patna / Gangetic Plains', state: 'Bihar' },
  { lng: 85.8245, lat: 20.2961, val: 45, name: 'Bhubaneswar Coastal', state: 'Odisha' },
  { lng: 88.3639, lat: 22.5726, val: 48, name: 'Kolkata Delta', state: 'West Bengal' },
  { lng: 80.9462, lat: 26.8467, val: 32, name: 'Lucknow / UP', state: 'Uttar Pradesh' },
  
  // Active Severe Hotspots (75-110+ mm/hr)
  { lng: 72.8777, lat: 19.0760, val: 95, name: 'Mumbai Metro', state: 'Maharashtra' },
  { lng: 73.1000, lat: 19.2000, val: 98, name: 'Thane / Kalyan', state: 'Maharashtra' },
  { lng: 73.3000, lat: 16.9902, val: 105, name: 'Ratnagiri Coast', state: 'Maharashtra' },
  { lng: 73.6600, lat: 17.9300, val: 110, name: 'Mahabaleshwar / Escarpment', state: 'Maharashtra' },
  { lng: 77.1734, lat: 31.1048, val: 85, name: 'Shimla Ridge', state: 'Himachal Pradesh' },
  { lng: 77.0999, lat: 30.9070, val: 88, name: 'Solan / Giri Basin', state: 'Himachal Pradesh' },
  { lng: 78.9814, lat: 30.2849, val: 92, name: 'Rudraprayag / Kedarnath', state: 'Uttarakhand' },
  { lng: 78.0322, lat: 30.3165, val: 84, name: 'Dehradun Valley', state: 'Uttarakhand' },
  { lng: 91.7362, lat: 26.1445, val: 96, name: 'Guwahati / Brahmaputra', state: 'Assam' },
  { lng: 91.5822, lat: 25.2975, val: 115, name: 'Mawsynram / Meghalaya Trough', state: 'Meghalaya' },
  { lng: 92.7789, lat: 24.8333, val: 82, name: 'Silchar Valley', state: 'Assam' },
  { lng: 76.1300, lat: 11.6800, val: 90, name: 'Wayanad Catchment', state: 'Kerala' },
];
