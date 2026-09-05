import { alertsData } from './alertsData.js';

// Atmospheric National Grid — 3x3 km Spatial Resolution (EPSG:4326 / LCC)
// Synthesizing ERA5 reanalysis moisture flux, INSAT-3D/3DR CTT drop rate,
// and CartoDEM topographic slope indices.
const INDIA_BOUNDS = { latMin: 6, latMax: 38, lngMin: 68, lngMax: 98 };
const GRID_RESOLUTION_DEG = 0.5; // Aggregated cell centroids for national Deck.gl/MapLibre layer

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

// Eagerly computed once at module load — cheap (~960 points x 3 hazards)
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
  dataSource: 'ERA5 Reanalysis + INSAT-3D/3DR + CartoDEM',
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
  // Western Coast & Western Ghats (Konkan / Sahyadri)
  { lng: 72.8777, lat: 19.0760, val: 94, name: 'Mumbai Metro', state: 'Maharashtra' },
  { lng: 73.1000, lat: 19.2000, val: 92, name: 'Thane / Kalyan', state: 'Maharashtra' },
  { lng: 73.6600, lat: 17.9300, val: 96, name: 'Mahabaleshwar / Western Ghats', state: 'Maharashtra' },
  { lng: 73.8567, lat: 18.5204, val: 78, name: 'Pune Outskirts', state: 'Maharashtra' },
  { lng: 73.8180, lat: 15.2993, val: 84, name: 'Goa Coastal', state: 'Goa' },
  { lng: 74.8560, lat: 12.9141, val: 80, name: 'Mangaluru Coast', state: 'Karnataka' },
  
  // Southern Peninsula & Kerala Western Ghats
  { lng: 76.2711, lat: 9.9312, val: 93, name: 'Kochi / Central Kerala', state: 'Kerala' },
  { lng: 76.1300, lat: 11.6800, val: 95, name: 'Wayanad Catchment', state: 'Kerala' },
  { lng: 76.9558, lat: 8.5241, val: 75, name: 'Thiruvananthapuram', state: 'Kerala' },
  { lng: 77.5946, lat: 12.9716, val: 76, name: 'Bengaluru Urban', state: 'Karnataka' },
  { lng: 80.2707, lat: 13.0827, val: 72, name: 'Chennai Metro', state: 'Tamil Nadu' },
  { lng: 78.4867, lat: 17.3850, val: 68, name: 'Hyderabad Deccan', state: 'Telangana' },
  
  // Northern Plains, NCR & Western Himalayas
  { lng: 77.1025, lat: 28.7041, val: 85, name: 'Delhi NCR', state: 'Delhi' },
  { lng: 76.9500, lat: 28.6000, val: 80, name: 'Gurugram', state: 'Haryana' },
  { lng: 77.1734, lat: 31.1048, val: 88, name: 'Shimla Ridge', state: 'Himachal Pradesh' },
  { lng: 77.0999, lat: 30.9070, val: 90, name: 'Solan / Giri Basin', state: 'Himachal Pradesh' },
  { lng: 78.0322, lat: 30.3165, val: 84, name: 'Dehradun Valley', state: 'Uttarakhand' },
  { lng: 78.9814, lat: 30.2849, val: 91, name: 'Rudraprayag / Kedarnath', state: 'Uttarakhand' },
  { lng: 74.8570, lat: 32.7266, val: 70, name: 'Jammu Foothills', state: 'Jammu & Kashmir' },
  
  // Eastern Region, Gangetic Delta & Northeast
  { lng: 88.3639, lat: 22.5726, val: 88, name: 'Kolkata Metro', state: 'West Bengal' },
  { lng: 88.2663, lat: 27.0410, val: 86, name: 'Darjeeling Hills', state: 'West Bengal' },
  { lng: 91.7362, lat: 26.1445, val: 98, name: 'Guwahati / Brahmaputra', state: 'Assam' },
  { lng: 92.7789, lat: 24.8333, val: 82, name: 'Silchar Valley', state: 'Assam' },
  { lng: 93.9368, lat: 24.8170, val: 79, name: 'Imphal Valley', state: 'Manipur' },
  { lng: 85.8245, lat: 20.2961, val: 78, name: 'Bhubaneswar Coastal', state: 'Odisha' },
  { lng: 85.1376, lat: 25.5941, val: 72, name: 'Patna Gangetic', state: 'Bihar' },
  
  // Central India & Western Plains
  { lng: 72.5714, lat: 23.0225, val: 68, name: 'Ahmedabad', state: 'Gujarat' },
  { lng: 72.8311, lat: 21.1702, val: 76, name: 'Surat Coast', state: 'Gujarat' },
  { lng: 79.0882, lat: 21.1458, val: 66, name: 'Nagpur Central', state: 'Maharashtra' },
  { lng: 77.4126, lat: 23.2599, val: 62, name: 'Bhopal Plateau', state: 'Madhya Pradesh' },
  { lng: 83.2185, lat: 17.6868, val: 74, name: 'Visakhapatnam Coast', state: 'Andhra Pradesh' },
  { lng: 75.8577, lat: 22.7196, val: 64, name: 'Indore Malwa', state: 'Madhya Pradesh' },
  { lng: 75.7873, lat: 26.9124, val: 60, name: 'Jaipur', state: 'Rajasthan' },
];
