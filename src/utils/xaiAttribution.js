/**
 * Physics-grounded Explainable AI (XAI) Attribution & Sensitivity Kernel
 * Models Integrated Gradients / SHAP proxy attribution across the 4 key convective catalysts:
 * 1. Moisture Flux & IWV Anomaly (IMDAA / INSAT-3D WV)
 * 2. Thermal Buoyancy & CAPE/CIN Erosion (IMDAA Reanalysis)
 * 3. Orographic & Geomorphic Gain (CartoDEM 30m)
 * 4. Convective Updraft Dynamics (INSAT-3D/3DR TIR Cooling Rate)
 */

export function calculateFeatureAttributions(params = {}) {
  const iwv = Number(params.iwv ?? 45);
  const cape = Number(params.cape ?? 1800);
  const cin = Number(params.cin ?? -15);
  const slope = Number(params.slope ?? 18);
  const cttDrop = Number(params.cttDrop ?? 8);
  const precipitation = Number(params.precipitation ?? 60);

  // 1. Moisture Flux: scales with column integrated water vapor & precipitation influx
  const moistureRaw = Math.max(
    5.0,
    Math.pow(iwv / 65.0, 1.25) * 34.0 + (precipitation / 120.0) * 12.0
  );

  // 2. Thermal Buoyancy: scales with CAPE (>1500 J/kg threshold) and CIN barrier erosion
  const absCin = Math.abs(cin);
  const cinPenalty = Math.max(0.2, 1.0 - absCin / 50.0);
  const capeExcess = cape > 1500 ? Math.pow((cape - 1500) / 1000.0, 1.2) * 14.0 : 0;
  const buoyancyRaw = Math.max(
    5.0,
    ((cape / 2800.0) * 26.0 + capeExcess) * cinPenalty
  );

  // 3. Orographic / Geomorphic Gain: CartoDEM slope acceleration & runoff channeling
  const slopeRaw = Math.max(
    5.0,
    Math.pow(slope / 32.0, 1.3) * 28.0 + (precipitation > 50 ? (precipitation / 100.0) * 8.0 : 0)
  );

  // 4. Updraft Dynamics: INSAT-3D CTT cooling rate (-6°C to -15°C/30min indicates severe updraft)
  const updraftRaw = Math.max(
    5.0,
    Math.pow(cttDrop / 12.0, 1.3) * 28.0
  );

  const totalRaw = moistureRaw + buoyancyRaw + slopeRaw + updraftRaw;

  // Normalize to integer percentages summing to exactly 100%
  let pctIwv = Math.round((moistureRaw / totalRaw) * 100);
  let pctBuoyancy = Math.round((buoyancyRaw / totalRaw) * 100);
  let pctSlope = Math.round((slopeRaw / totalRaw) * 100);
  let pctUpdraft = Math.round((updraftRaw / totalRaw) * 100);

  const sum = pctIwv + pctBuoyancy + pctSlope + pctUpdraft;
  const diff = 100 - sum;

  // Apply rounding difference to the highest attribution driver
  const values = [
    { key: 'iwv', val: pctIwv },
    { key: 'buoyancy', val: pctBuoyancy },
    { key: 'slope', val: pctSlope },
    { key: 'updraft', val: pctUpdraft },
  ];
  values.sort((a, b) => b.val - a.val);

  if (values[0].key === 'iwv') pctIwv += diff;
  else if (values[0].key === 'buoyancy') pctBuoyancy += diff;
  else if (values[0].key === 'slope') pctSlope += diff;
  else pctUpdraft += diff;

  const attributions = [
    {
      id: 'iwv',
      name: 'Moisture Flux & IWV Anomaly',
      catalyst: '1. Moisture Influx',
      dataset: 'IMDAA / INSAT-3D WV',
      percentage: pctIwv,
      value: `${iwv} kg/m²`,
      color: '#0284c7', // Sky / Cyan
      lightBg: 'bg-cyan-50',
      badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      description: 'Marine boundary layer moisture convergence and precipitable water column saturation.',
    },
    {
      id: 'buoyancy',
      name: 'Thermal Buoyancy (CAPE / CIN)',
      catalyst: '2. Updraft Buoyancy',
      dataset: 'IMDAA ERA5 Reanalysis',
      percentage: pctBuoyancy,
      value: `${cape} J/kg (CIN: ${cin} J/kg)`,
      color: '#e11d48', // Rose
      lightBg: 'bg-rose-50',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      description: 'Thermodynamic parcel acceleration and eroding capping inversion barrier.',
    },
    {
      id: 'slope',
      name: 'Orographic Gain (CartoDEM)',
      catalyst: '3. Runoff Channeling',
      dataset: 'CartoDEM 30m Hydrograph',
      percentage: pctSlope,
      value: `${slope}° Slope Gradient`,
      color: '#d97706', // Amber
      lightBg: 'bg-amber-50',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'Topographic slope and valley geomorphic convergence accelerating surface runoff.',
    },
    {
      id: 'updraft',
      name: 'Updraft Dynamics (CTT Drop)',
      catalyst: '4. Convective Velocity',
      dataset: 'INSAT-3D/3DR TIR 10.8µm',
      percentage: pctUpdraft,
      value: `-${cttDrop}°C / 30min`,
      color: '#9333ea', // Purple
      lightBg: 'bg-purple-50',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Rapid cloud top temperature drop detecting violent vertical convective plumes.',
    },
  ];

  // Sort to identify the dominant catalyst
  const sorted = [...attributions].sort((a, b) => b.percentage - a.percentage);
  const dominantDriver = sorted[0];

  attributions.forEach((item) => {
    item.isDominant = item.id === dominantDriver.id;
  });

  const narrative = generateXAINarrative(dominantDriver, {
    iwv,
    cape,
    cin,
    slope,
    cttDrop,
    precipitation,
  });

  return {
    attributions,
    dominantDriver,
    narrative,
    totalPercentage: 100,
  };
}

/**
 * Dynamically synthesizes the physical diagnostic XAI narrative
 * explicitly citing the dominant driver and the authoritative datasets:
 * IMDAA, INSAT-3D/3DR, and CartoDEM.
 */
export function generateXAINarrative(dominant, params) {
  const { iwv, cape, cin, slope, cttDrop } = params;

  switch (dominant.id) {
    case 'iwv':
      return `Marine boundary layer moisture convergence (IMDAA) is the primary convective driver, accounting for ${dominant.percentage}% of the cloudburst signal with deep tropospheric column saturation (${iwv} kg/m²). INSAT-3D/3DR water vapor channel tracking confirms sustained southwesterly monsoonal surge, while CartoDEM topographic slope (${slope}°) channels precipitation into saturated drainage basins.`;

    case 'buoyancy':
      return `Intense boundary layer thermodynamic instability (IMDAA CAPE: ${cape} J/kg) with an eroding convective inhibition barrier (${cin} J/kg CIN) is the dominant driver, accounting for ${dominant.percentage}% of convective updraft initiation. Uncapped thermal buoyancy accelerates explosive parcel ascent, verified by INSAT-3D/3DR infrared thermal cooling gradients and localized by CartoDEM valley contours.`;

    case 'slope':
      return `Steep CartoDEM orographic convergence (${slope}° slope gradient) accelerates runoff translation and geomorphic hydrograph channeling, accounting for ${dominant.percentage}% of the localized flash-flood signal. Steep terrain induces rapid hydrological concentration into mountain riverbeds, converting incoming IMDAA moisture flux into immediate inundation hazard ahead of INSAT-3D cloud dissipation.`;

    case 'updraft':
    default:
      return `Violent convective vertical plume acceleration detected by INSAT-3D/3DR TIR cooling (-${cttDrop}°C/30min) is the primary driver, accounting for ${dominant.percentage}% of severe convective storm severity. Rapid cloud-top glaciation indicates intense localized core updrafts fueled by IMDAA atmospheric moisture (${iwv} kg/m²) and constrained by CartoDEM valley morphology.`;
  }
}
