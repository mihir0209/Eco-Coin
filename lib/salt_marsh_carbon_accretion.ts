export interface SaltMarshAccretionResult {
  sedimentAccretionRateMmYr: number;
  annualBiomassSequestrationTco2ePerHa: number;
  elevationDeficitAgainstSeaLevelRiseMmYr: number;
  marshHealthStatus: "ACCRETING_HEALTHY" | "SUBMERGENCE_RISK";
}

export function modelTidalSaltMarshAccretion(
  setMhSurfaceAccretionMmYr: number, // typical 2.0 to 8.0 mm/yr
  localSeaLevelRiseRateMmYr: number = 3.5,
  spartinaAboveGroundBiomassGPerM2: number = 850.0 // g dry biomass / m2
): SaltMarshAccretionResult {
  if (setMhSurfaceAccretionMmYr <= 0) {
    return { sedimentAccretionRateMmYr: 0, annualBiomassSequestrationTco2ePerHa: 0, elevationDeficitAgainstSeaLevelRiseMmYr: localSeaLevelRiseRateMmYr, marshHealthStatus: "SUBMERGENCE_RISK" };
  }

  // 1 ha = 10,000 m2. Biomass is ~45% carbon. Below-ground root production is ~1.5x above-ground biomass.
  const totalBiomassCarbonGPerM2 = spartinaAboveGroundBiomassGPerM2 * 2.5 * 0.45;
  const totalBiomassCarbonTonnesPerHa = (totalBiomassCarbonGPerM2 * 10000.0) / 1e6;
  const co2ePerHa = Number((totalBiomassCarbonTonnesPerHa * (44.0 / 12.0)).toFixed(2));

  // Marsh must keep pace with local sea level rise to avoid drown-out
  const deficit = localSeaLevelRiseRateMmYr - setMhSurfaceAccretionMmYr;
  const isHealthy = setMhSurfaceAccretionMmYr >= localSeaLevelRiseRateMmYr;

  return {
    sedimentAccretionRateMmYr: setMhSurfaceAccretionMmYr,
    annualBiomassSequestrationTco2ePerHa: co2ePerHa,
    elevationDeficitAgainstSeaLevelRiseMmYr: Number(deficit.toFixed(2)),
    marshHealthStatus: isHealthy ? "ACCRETING_HEALTHY" : "SUBMERGENCE_RISK",
  };
}
