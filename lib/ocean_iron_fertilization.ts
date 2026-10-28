export function calculateIronFertilizationCarbonExport(
  chelatedIronTonsAdded: number,
  baselineChlorophyllMgM3: number,
  bloomPeakChlorophyllMgM3: number,
  waterDepthMeters: number,
  carbonToIronMolarRatio: number = 20000.0 // Martin's Redfield ratio multiplier: ~10^4 to 10^5
): { netCarbonExportTco2e: number; chlorophyllSurgeRatio: number; mesopelagicPermanenceValid: boolean } {
  if (chelatedIronTonsAdded <= 0 || baselineChlorophyllMgM3 <= 0 || bloomPeakChlorophyllMgM3 <= baselineChlorophyllMgM3) {
    return { netCarbonExportTco2e: 0, chlorophyllSurgeRatio: 1.0, mesopelagicPermanenceValid: false };
  }
  const chlorophyllSurgeRatio = Number((bloomPeakChlorophyllMgM3 / baselineChlorophyllMgM3).toFixed(2));
  // Sinking beyond mesopelagic (>500m) is required for deep-sea carbon export permanence
  const mesopelagicPermanenceValid = waterDepthMeters >= 500;
  if (!mesopelagicPermanenceValid) {
    return { netCarbonExportTco2e: 0, chlorophyllSurgeRatio, mesopelagicPermanenceValid: false };
  }

  // Atomic weights: Fe = 55.845 g/mol, C = 12.011 g/mol
  // Carbon mass = Iron mass * (molar_ratio * 12.011 / 55.845)
  // Attenuation: only ~5-15% of surface bloom sinks past 500m (Martin curve b ~ 0.86)
  const surfaceCarbonTons = chelatedIronTonsAdded * (carbonToIronMolarRatio * 12.011 / 55.845);
  const deepExportFraction = Math.max(0.05, Math.min(0.20, (waterDepthMeters / 1000.0) * 0.10));
  const sequesteredCarbonTons = surfaceCarbonTons * deepExportFraction;
  // Convert C to CO2e (* 44/12)
  const netCarbonExportTco2e = Number((sequesteredCarbonTons * (44.0 / 12.0)).toFixed(2));

  return { netCarbonExportTco2e, chlorophyllSurgeRatio, mesopelagicPermanenceValid };
}
