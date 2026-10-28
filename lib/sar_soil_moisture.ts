export function evaluateSarSoilMoisture(
  sigma0BackscatterDb: number, // Sentinel-1 radar backscatter (typically -20 to -5 dB)
  incidenceAngleDeg: number,
  soilRoughnessCm: number = 1.5
): { volumetricSoilMoisturePct: number; droughtRiskLevel: "SEVERE" | "MODERATE" | "OPTIMAL" } {
  // Normalize incidence angle to 40 degrees standard
  const angleRad = (incidenceAngleDeg * Math.PI) / 180.0;
  const normalizedSigma0 = sigma0BackscatterDb / Math.cos(angleRad);

  // Empirical water dielectric relationship with radar reflectivity
  // Drier soil has lower dielectric constant -> lower backscatter (more negative dB)
  const estimatedVsm = Math.max(2.0, Math.min(50.0, (normalizedSigma0 + 35.0) * 1.5 - soilRoughnessCm * 2.0));
  const volumetricSoilMoisturePct = Number(estimatedVsm.toFixed(1));

  let droughtRiskLevel: "SEVERE" | "MODERATE" | "OPTIMAL" = "OPTIMAL";
  if (volumetricSoilMoisturePct < 10.0) {
    droughtRiskLevel = "SEVERE";
  } else if (volumetricSoilMoisturePct < 20.0) {
    droughtRiskLevel = "MODERATE";
  }

  return { volumetricSoilMoisturePct, droughtRiskLevel };
}
