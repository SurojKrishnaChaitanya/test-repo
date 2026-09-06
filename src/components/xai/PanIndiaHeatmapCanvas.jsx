import React, { useRef, useEffect } from 'react';
import { PAN_INDIA_REGIONAL_NODES } from '../../data/nationalGridData';

// High-fidelity geographic boundary points for the Indian subcontinent
// Captures the Northern Himalayan crown, Western desert & Kutch/Saurashtra peninsulas,
// Southern tip (Kanyakumari), Coromandel & Eastern delta, and the complete Northeast wing.
const INDIA_LANDMASS_COORDS = [
  // Western Border (Gujarat / Rajasthan / Punjab / J&K)
  [23.7, 68.1], [24.3, 68.8], [24.0, 69.5], [24.4, 70.8], [25.0, 70.8], [26.0, 70.3], [27.0, 70.8], 
  [28.1, 70.4], [28.6, 72.0], [29.8, 73.0], [30.2, 73.9], [31.0, 74.5], [32.0, 74.9], [32.5, 74.3], 
  [33.1, 74.0], [34.0, 74.1], [34.5, 73.8],
  
  // Northern Crown (Kashmir & Ladakh up to 37.1)
  [35.0, 74.4], [35.5, 74.9], [36.0, 75.3], [36.6, 74.5], [37.1, 74.6], [36.6, 75.5], [35.8, 76.5],
  [35.4, 77.3], [35.6, 78.0], [35.4, 78.3], [35.6, 79.0], [35.3, 80.0], [34.7, 79.5], [34.0, 79.0],
  [33.6, 78.8], [33.0, 79.2], [32.4, 78.5], [31.8, 78.8], [31.4, 79.0], [31.0, 79.1], [30.4, 80.8],
  [29.8, 80.5], [29.0, 80.1], 
  
  // Nepal Border
  [28.5, 80.5], [28.0, 81.5], [27.5, 83.0], [27.0, 84.5], [26.5, 86.0], [26.4, 87.5], [26.8, 88.0],
  [27.2, 88.1],
  
  // Sikkim & Bhutan Border
  [28.0, 88.6], [27.4, 89.0], [26.8, 89.1], [26.7, 89.8], [26.8, 91.5], [27.3, 91.9], [27.8, 92.0],
  
  // Arunachal Pradesh & Northeast Wing (up to 97.4)
  [27.9, 92.6], [28.6, 93.4], [29.2, 94.2], [29.4, 95.5], [29.0, 96.5], [28.2, 97.4], [27.6, 97.0],
  
  // Eastern Border (Myanmar & Bangladesh)
  [27.0, 96.0], [26.5, 95.0], [25.5, 94.6], [24.5, 94.2], [23.5, 93.5], [22.2, 93.1], [21.9, 92.6],
  [22.8, 92.1], [23.8, 91.5], [24.5, 92.0], [25.0, 92.2], [25.3, 91.0], [25.2, 89.9], [25.8, 89.6],
  [26.2, 89.9], [26.4, 89.0], [25.0, 88.5], [24.0, 88.7], [23.0, 88.9], [22.0, 89.0], [21.6, 88.2],
  
  // Eastern Coast (Sundarbans to Coromandel)
  [21.6, 87.2], [21.0, 86.8], [20.0, 86.0], [19.3, 85.0], [18.5, 84.1], [17.8, 83.5], [17.0, 82.3],
  [16.2, 81.3], [15.5, 80.2], [14.0, 80.2], [13.0, 80.3], [12.0, 79.9], [10.8, 79.8], [9.8, 79.2],
  [9.0, 78.5], [8.1, 77.5], 
  
  // Kanyakumari
  [8.08, 77.55],
  
  // Western Coast (Konkan to Saurashtra & Kutch)
  [8.5, 76.8], [9.5, 76.3], [10.5, 75.9], [11.5, 75.5], [12.5, 75.0], [13.5, 74.6], [14.5, 74.3],
  [15.5, 73.7], [16.5, 73.3], [17.5, 73.1], [18.5, 72.9], [19.5, 72.7], [20.0, 72.8], [20.7, 72.9],
  
  // Gujarat / Gulf of Khambhat & Saurashtra
  [21.2, 72.5], [20.8, 71.5], [20.8, 70.5], [21.5, 69.5], [22.3, 69.0], [22.8, 70.2], [23.0, 68.5]
];

// Key internal state and geological divide boundaries
const STATE_BOUNDARIES = [
  // Western Ghats Ridge Spine
  [[21.0, 73.5], [19.5, 73.6], [17.9, 73.7], [15.5, 74.1], [13.0, 75.3], [10.2, 76.8], [8.5, 77.3]],
  // Central Vindhya / Satpura Geological Divide
  [[22.5, 74.0], [22.8, 77.0], [23.2, 80.0], [23.5, 83.0], [23.8, 86.5]],
  // Indo-Gangetic Northern Basin Divide
  [[30.5, 76.0], [28.5, 77.5], [27.0, 80.5], [25.5, 84.0], [24.5, 87.5]],
  // Deccan Peninsular Plateau Arc
  [[19.0, 73.5], [18.5, 76.0], [17.5, 78.5], [16.0, 80.5]],
  // Northeast Brahmaputra Corridor
  [[26.0, 89.8], [26.3, 91.5], [26.8, 93.5], [27.4, 95.5]],
];

// Maritime boundary zone containing Arabian Sea & Bay of Bengal inflow
const MARITIME_BUFFER_COORDS = [
  [37.5, 68.0], [7.5, 68.0], [7.5, 97.5], [37.5, 97.5], [37.5, 68.0]
];

export default function PanIndiaHeatmapCanvas({ mode = 'thermodynamic', selectedRegion }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 500;
    const height = Math.max(380, Math.round(width * 0.82));

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Geographic Projection Configuration (8°N–37°N, 68°E–97.5°E)
    const pad = { top: 26, right: 30, bottom: 44, left: 42 };
    const pW = width - pad.left - pad.right;
    const pH = height - pad.top - pad.bottom;

    const minLng = 68.0, maxLng = 97.5;
    const minLat = 7.5, maxLat = 37.5;

    const toX = (lng) => pad.left + ((lng - minLng) / (maxLng - minLng)) * pW;
    const toY = (lat) => pad.top + ((maxLat - lat) / (maxLat - minLat)) * pH;

    // 1. Deep Space/Oceanic Background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Subtle plotting frame
    ctx.fillStyle = '#0a101f';
    ctx.fillRect(pad.left, pad.top, pW, pH);

    // 2. Arabian Sea & Bay of Bengal Marine Base Shading
    ctx.fillStyle = '#0d1629';
    ctx.fillRect(pad.left, toY(24), toX(73) - pad.left, pad.top + pH - toY(24)); // Arabian Sea
    ctx.fillRect(toX(83), toY(22), pad.left + pW - toX(83), pad.top + pH - toY(22)); // Bay of Bengal

    // Marine zone labels
    ctx.font = 'italic 9px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('ARABIAN SEA', toX(71.0), toY(15.0));
    ctx.fillText('BAY OF BENGAL', toX(88.5), toY(15.0));
    ctx.fillText('INDIAN OCEAN', toX(78.5), toY(8.0));

    // 3. Crisp Geographic Lat/Long Graticules
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 4]);

    const latTicks = [10, 20, 30];
    const lngTicks = [70, 80, 90];

    ctx.font = '9px ui-monospace, monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    latTicks.forEach((lat) => {
      const y = toY(lat);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pW, y);
      ctx.stroke();
      ctx.fillText(`${lat}°N`, pad.left - 5, y);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lngTicks.forEach((lng) => {
      const x = toX(lng);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + pH);
      ctx.stroke();
      ctx.fillText(`${lng}°E`, x, pad.top + pH + 5);
    });
    ctx.setLineDash([]);

    // 4. Create India Path for Masking and Outlining
    const makeIndiaPath = () => {
      const p = new Path2D();
      INDIA_LANDMASS_COORDS.forEach(([lat, lng], idx) => {
        const x = toX(lng);
        const y = toY(lat);
        if (idx === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      });
      p.closePath();
      return p;
    };

    const indiaPath = makeIndiaPath();

    // 5. Draw Landmass Base
    ctx.fillStyle = '#0f172a';
    ctx.fill(indiaPath);

    // 6. Meteorological Field Interpolation (IDW over Subcontinent Domain)
    // Gather active synoptic nodes from PAN_INDIA_REGIONAL_NODES + selectedRegion
    const activeNodes = [...PAN_INDIA_REGIONAL_NODES];

    if (selectedRegion && selectedRegion.lat && selectedRegion.lng) {
      activeNodes.push({
        lat: selectedRegion.lat,
        lng: selectedRegion.lng,
        val: selectedRegion.baselineParams?.cape < 1000 ? 12 : (selectedRegion.baselineHazard === 'flashFlood' ? 95 : 55),
        name: selectedRegion.name,
      });
    }

    // Color ramp interpolation helper functions
    const getColor = (t) => {
      const clamped = Math.max(0, Math.min(1, t));
      if (mode === 'thermodynamic') {
        // IMDAA: Deep Navy (0.0) -> Teal (0.25) -> Emerald (0.5) -> Amber (0.75) -> Crimson (1.0)
        if (clamped < 0.25) {
          const f = clamped / 0.25;
          return [
            Math.round(10 + f * 4),
            Math.round(20 + f * 112),
            Math.round(45 + f * 188),
            0.65 + f * 0.15,
          ]; // #0a142d -> #0ea5e9
        } else if (clamped < 0.5) {
          const f = (clamped - 0.25) / 0.25;
          return [
            Math.round(14 + f * 2),
            Math.round(132 + f * 53),
            Math.round(233 - f * 104),
            0.8,
          ]; // #0ea5e9 -> #10b981
        } else if (clamped < 0.75) {
          const f = (clamped - 0.5) / 0.25;
          return [
            Math.round(16 + f * 229),
            Math.round(185 - f * 27),
            Math.round(129 - f * 118),
            0.85,
          ]; // #10b981 -> #f59e0b
        } else {
          const f = (clamped - 0.75) / 0.25;
          return [
            Math.round(245 - f * 6),
            Math.round(158 - f * 90),
            Math.round(11 + f * 57),
            0.92,
          ]; // #f59e0b -> #ef4444
        }
      } else {
        // INSAT-3D TIR CTT + CartoDEM: Deep Navy (0.0) -> Cyan (0.3) -> Magenta (0.65) -> White Storm Cores (1.0)
        if (clamped < 0.3) {
          const f = clamped / 0.3;
          return [
            Math.round(11 + f * 45),
            Math.round(19 + f * 170),
            Math.round(43 + f * 205),
            0.65 + f * 0.15,
          ]; // Navy -> Cyan
        } else if (clamped < 0.65) {
          const f = (clamped - 0.3) / 0.35;
          return [
            Math.round(56 + f * 161),
            Math.round(189 - f * 119),
            Math.round(248 - f * 9),
            0.82,
          ]; // Cyan -> Magenta
        } else if (clamped < 0.85) {
          const f = (clamped - 0.65) / 0.2;
          return [
            Math.round(217 + f * 27),
            Math.round(70 - f * 7),
            Math.round(239 - f * 145),
            0.88,
          ]; // Magenta -> Crimson
        } else {
          const f = (clamped - 0.85) / 0.15;
          return [
            Math.round(244 + f * 11),
            Math.round(63 + f * 192),
            Math.round(94 + f * 161),
            0.95,
          ]; // Crimson -> Bright White Core
        }
      }
    };

    // Render continuous field on an offscreen raster buffer
    const gridW = 68;
    const gridH = 68;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = gridW;
    offCanvas.height = gridH;
    const offCtx = offCanvas.getContext('2d');

    if (offCtx) {
      const imgData = offCtx.createImageData(gridW, gridH);
      const data = imgData.data;

      for (let gy = 0; gy < gridH; gy++) {
        const lat = maxLat - (gy / (gridH - 1)) * (maxLat - minLat);
        for (let gx = 0; gx < gridW; gx++) {
          const lng = minLng + (gx / (gridW - 1)) * (maxLng - minLng);

          let num = 0;
          let den = 0;

          for (let i = 0; i < activeNodes.length; i++) {
            const n = activeNodes[i];
            const dLat = lat - n.lat;
            const dLng = lng - n.lng;
            const distSq = dLat * dLat + dLng * dLng;
            // IDW weighting with smoothing factor
            const weight = 1 / Math.pow(distSq + 1.2, 1.35);
            num += (n.val / 100) * weight;
            den += weight;
          }

          let normVal = num / (den || 1);

          // Regional physical amplification
          const isWesternGhats = lng >= 72.5 && lng <= 76.5 && lat >= 8.5 && lat <= 20.5;
          const isNortheast = lng >= 88.5 && lng <= 96.5 && lat >= 22.5 && lat <= 28.5;
          const isHimalayas = lng >= 75.0 && lng <= 81.0 && lat >= 29.5 && lat <= 33.5;

          if (isWesternGhats) normVal = Math.min(1.0, normVal * 1.22);
          if (isNortheast) normVal = Math.min(1.0, normVal * 1.25);
          if (isHimalayas) normVal = Math.min(1.0, normVal * 1.18);

          const [r, g, b, a] = getColor(normVal);
          const pixelIdx = (gy * gridW + gx) * 4;
          data[pixelIdx] = r;
          data[pixelIdx + 1] = g;
          data[pixelIdx + 2] = b;
          data[pixelIdx + 3] = Math.round(a * 255);
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // 7. Paint Clipped Continuous Meteorological Plumes
      ctx.save();
      // Clip strictly within the Indian landmass (and coastal marine influence)
      ctx.beginPath();
      ctx.rect(pad.left, pad.top, pW, pH);
      ctx.clip();

      // Smooth bilinear image smoothing for authentic satellite look
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clip specifically to the Indian Landmass boundary
      ctx.save();
      ctx.clip(indiaPath);
      ctx.drawImage(offCanvas, pad.left, pad.top, pW, pH);
      ctx.restore();



      ctx.restore();
    }

    // 8. Draw Internal Geological / State Boundary Dividing Lines
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
    ctx.lineWidth = 1;
    STATE_BOUNDARIES.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lat, lng], idx) => {
        const x = toX(lng);
        const y = toY(lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // 9. Crisp Coastline & National Border Outline
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.stroke(indiaPath);

    // 10. Synoptic Monsoonal Moisture Surge Vector Arrows
    const drawWindArrow = (startX, startY, endX, endY) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 5 * Math.cos(angle - Math.PI / 6), endY - 5 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endX - 5 * Math.cos(angle + Math.PI / 6), endY - 5 * Math.sin(angle + Math.PI / 6));
      ctx.fill();
      ctx.restore();
    };

    // South-westerly monsoonal surge vectors over Arabian Sea into Western Ghats
    drawWindArrow(toX(69.5), toY(12.0), toX(73.5), toY(15.0));
    drawWindArrow(toX(70.0), toY(16.0), toX(73.0), toY(18.5));
    // Bay of Bengal recurving surge into Northeast
    drawWindArrow(toX(86.0), toY(16.5), toX(89.5), toY(21.5));
    drawWindArrow(toX(90.0), toY(22.0), toX(92.5), toY(25.5));

    // 11. Target Region Indicator Overlay
    if (selectedRegion && selectedRegion.lat && selectedRegion.lng) {
      const rx = toX(selectedRegion.lng);
      const ry = toY(selectedRegion.lat);

      // Outer radar pulse circle
      ctx.beginPath();
      ctx.arc(rx, ry, 11, 0, Math.PI * 2);
      ctx.strokeStyle = mode === 'thermodynamic' ? '#38bdf8' : '#e879f9';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Precision crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rx - 7, ry);
      ctx.lineTo(rx + 7, ry);
      ctx.moveTo(rx, ry - 7);
      ctx.lineTo(rx, ry + 7);
      ctx.stroke();

      // Solid epicenter dot
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Region Identification Callout
      ctx.font = 'bold 9px system-ui, sans-serif';
      const label = `${selectedRegion.name} (${selectedRegion.lat.toFixed(1)}°N, ${selectedRegion.lng.toFixed(1)}°E)`;
      const textWidth = ctx.measureText(label).width;
      const lx = Math.min(width - pad.right - textWidth - 8, Math.max(pad.left + 4, rx + 14));
      const ly = Math.max(pad.top + 14, ry - 4);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = mode === 'thermodynamic' ? '#38bdf8' : '#e879f9';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(lx - 4, ly - 9, textWidth + 8, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly - 1);
    }

    // 12. Continuous Meteorological Scale Bar (Bottom Right HUD)
    const barW = Math.min(190, pW * 0.48);
    const barH = 7;
    const barX = pad.left + pW - barW;
    const barY = pad.top + pH - 12;

    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    if (mode === 'thermodynamic') {
      barGrad.addColorStop(0.0, '#0a142d');
      barGrad.addColorStop(0.25, '#0ea5e9');
      barGrad.addColorStop(0.5, '#10b981');
      barGrad.addColorStop(0.75, '#f59e0b');
      barGrad.addColorStop(1.0, '#ef4444');
    } else {
      barGrad.addColorStop(0.0, '#0b132b');
      barGrad.addColorStop(0.3, '#06b6d4');
      barGrad.addColorStop(0.65, '#d946ef');
      barGrad.addColorStop(0.85, '#f43f5e');
      barGrad.addColorStop(1.0, '#ffffff');
    }

    // Scale Bar Background Pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(barX - 6, barY - 14, barW + 12, 28, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Scale Bar Fill
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY, barW, barH);

    // Scale Bar Numerical Labels
    ctx.font = '8px ui-monospace, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(mode === 'thermodynamic' ? '20 kg/m² (500 J)' : '-20°C TIR', barX, barY - 2);

    ctx.textAlign = 'right';
    ctx.fillText(mode === 'thermodynamic' ? '75 kg/m² (4500 J)' : '< -80°C CTT', barX + barW, barY - 2);

  }, [mode, selectedRegion]);

  return (
    <div ref={containerRef} className="w-full flex justify-center items-center relative overflow-hidden rounded-xl bg-slate-950 p-2 shadow-inner border border-slate-800">
      <canvas ref={canvasRef} className="block w-full h-auto" />
    </div>
  );
}
