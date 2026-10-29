export interface GediCanopyBiomassEstimate {
  relativeHeight98Meters: number;
  estimatedAboveGroundBiomassTonnesPerHa: number;
  aboveGroundCarbonStockTco2ePerHa: number;
  forestStratumTier: "OLD_GROWTH_PRIMARY" | "SECONDARY_REGENERATING" | "DEGRADED_OPEN";
}

export function estimateGediLidarBiomass(
  rh98HeightMeters: number, // 98th percentile canopy height
  rh50HeightMeters: number = 18.0
): GediCanopyBiomassEstimate {
  if (rh98HeightMeters <= 0) {
    return { relativeHeight98Meters: 0, estimatedAboveGroundBiomassTonnesPerHa: 0, aboveGroundCarbonStockTco2ePerHa: 0, forestStratumTier: "DEGRADED_OPEN" };
  }

  // Canonical pantropical allometric power law: AGB = 0.06 * (RH98)^2.1
  const agbTonnesPerHa = Number((0.06 * Math.pow(rh98HeightMeters, 2.1)).toFixed(2));
  // Carbon content ~48% of dry biomass -> CO2e (* 44/12)
  const co2ePerHa = Number((agbTonnesPerHa * 0.48 * (44.0 / 12.0)).toFixed(2));

  let tier: "OLD_GROWTH_PRIMARY" | "SECONDARY_REGENERATING" | "DEGRADED_OPEN" = "DEGRADED_OPEN";
  if (rh98HeightMeters >= 35.0) {
    tier = "OLD_GROWTH_PRIMARY";
  } else if (rh98HeightMeters >= 18.0) {
    tier = "SECONDARY_REGENERATING";
  }

  return {
    relativeHeight98Meters: rh98HeightMeters,
    estimatedAboveGroundBiomassTonnesPerHa: agbTonnesPerHa,
    aboveGroundCarbonStockTco2ePerHa: co2ePerHa,
    forestStratumTier: tier,
  };
}
