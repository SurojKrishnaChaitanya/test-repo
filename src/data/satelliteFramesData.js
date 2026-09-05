// Static multi-sensor input sequence — ERA5 Reanalysis combined with
// INSAT-3D/3DR Water Vapor (6.5–7.1 µm) & Thermal IR (10.8 µm) channels
// and CartoDEM elevation/drainage at a 3x3 km spatial resolution.
//
// Demonstrates the operational input stream feeding Earthformer-ConvLSTM-DGMR
// dual-task nowcasting across Indian convective microclimates.

export const satelliteFramesData = [
  {
    id: 'frame-1',
    timestamp: '2018-06-21T07:15:00Z',
    label: '01:15',
    imagePath: '/satellite-frames/western-ghats1-0715.png',
    caption: 'An extreme convective core (>110 mm/hr) is localized at 10.5°N, 75.6°E (Central Kerala / Western Ghats). A secondary cell (30–40 mm/hr) is visible further north at 11.8°N with steep CartoDEM terrain drainage convergence.',
  },
  {
    id: 'frame-2',
    timestamp: '2018-06-21T07:45:00Z',
    label: '01:45',
    imagePath: '/satellite-frames/western-ghats1-0745.png',
    caption: '30 minutes later, the primary core at 10.5°N has remained stationary over topography, intensifying to dark red (>120 mm/hr) with rapid INSAT-3DR CTT cooling (-8°C/30min) and ERA5 moisture convergence.',
  },
];

export const satelliteSource = {
  product: 'IMDAA + INSAT-3D/3DR WV/TIR + CartoDEM',
  event: 'Western Ghats Cloudburst',
  spatialResolution: '3km x 3km',
  crs: 'EPSG:4326_LCC',
  scaleUnit: 'mm/hr',
  scaleMax: 120,
};
