export function modelMangroveSedimentCarbonStock(
  coreDepthMeters: number,
  dryBulkDensityGPerCm3: number,
  sedimentCarbonFractionPct: number,
  areaHectares: number,
  sedimentationRateMmPerYr: number = 2.5
): { totalBuriedCarbonTco2e: number; permanenceCenturyHorizon: number; annualAccretionTco2e: number } {
  if (coreDepthMeters <= 0 || dryBulkDensityGPerCm3 <= 0 || sedimentCarbonFractionPct <= 0 || areaHectares <= 0) {
    return { totalBuriedCarbonTco2e: 0, permanenceCenturyHorizon: 0, annualAccretionTco2e: 0 };
  }
  // 1 m depth = 100 cm. Soil mass per ha = depth_cm * bulk_density * 100
  // Stock per ha (tons C) = depth_cm * bulk_density * (%C / 100) * 100
  const depthCm = coreDepthMeters * 100.0;
  const carbonTonsPerHa = depthCm * dryBulkDensityGPerCm3 * (sedimentCarbonFractionPct / 100.0) * 100.0;
  // Convert Carbon tons to CO2e (* 44/12)
  const totalBuriedCarbonTco2e = Number((carbonTonsPerHa * areaHectares * (44.0 / 12.0)).toFixed(2));

  // Permanence estimate: depth (mm) / accretion_rate (mm/yr) / 100 -> centuries
  const depthMm = coreDepthMeters * 1000.0;
  const years = depthMm / sedimentationRateMmPerYr;
  const permanenceCenturyHorizon = Number((years / 100.0).toFixed(1));

  // Annual accretion
  const annualAccretionTco2e = Number(((sedimentationRateMmPerYr / 10.0) * dryBulkDensityGPerCm3 * (sedimentCarbonFractionPct / 100.0) * 100.0 * areaHectares * (44.0 / 12.0)).toFixed(2));

  return { totalBuriedCarbonTco2e, permanenceCenturyHorizon, annualAccretionTco2e };
}
