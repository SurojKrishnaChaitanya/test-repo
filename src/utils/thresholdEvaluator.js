import { regionalThresholdConfigs, thresholdRuleMeta } from '../data/thresholdConfigData';
import { telemetryData } from '../data/telemetryData';

/**
 * Evaluates a region's alert threshold rules against its live telemetry.
 * Pulls telemetry from telemetryData.js by default; an override can be
 * passed for custom evaluations — no styling included,
 * consuming components decide how to render `isMet`/`tier`.
 */
export function getRegionThresholds(regionId, telemetryOverride = null) {
  const config = regionalThresholdConfigs[regionId];
  if (!config) return null;

  const telemetry = telemetryOverride ?? telemetryData[regionId]?.current;
  if (!telemetry) return null;

  const isFlashFloodMet =
    telemetry.iwv > config.flashFlood.iwv && telemetry.cttDrop30m > config.flashFlood.cttDrop;

  const isCloudburstMet = telemetry.rainfallRate > config.cloudburst.rainfallRate;

  const isHighWindMet = telemetry.windGust > config.highWind.speed;

  const build = (id, ruleText, isMet) => ({
    id,
    ...thresholdRuleMeta[id],
    ruleText,
    isMet,
    statusText: isMet ? 'Triggered' : 'Not Met',
  });

  return {
    regionId,
    regionName: config.regionName,
    thresholds: [
      build(
        'flash-flood-critical',
        `IWV > ${config.flashFlood.iwv}mm AND CTT drop > ${config.flashFlood.cttDrop}°C/30min`,
        isFlashFloodMet
      ),
      build(
        'cloudburst-warning',
        `Rainfall Rate > ${config.cloudburst.rainfallRate}mm/h over ${config.cloudburst.area}km²`,
        isCloudburstMet
      ),
      build('high-wind-watch', `Wind Gust > ${config.highWind.speed}km/h`, isHighWindMet),
    ],
  };
}