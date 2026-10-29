export interface InSarSubsidenceMetrics {
  subsidenceRateMmPerYear: number;
  interferometricCoherenceGamma: number;
  inferredCarbonLossTco2ePerHaYr: number;
  isOxidationSubsidenceSevere: boolean;
}

export function evaluateInSarPeatlandSubsidence(
  phaseDifferenceRadians: number,
  temporalBaselineDays: number,
  radarWavelengthCm: number = 5.55, // Sentinel-1 C-band ~ 5.55 cm
  interferometricCoherence: number = 0.65
): InSarSubsidenceMetrics {
  if (temporalBaselineDays <= 0) {
    return { subsidenceRateMmPerYear: 0, interferometricCoherenceGamma: interferometricCoherence, inferredCarbonLossTco2ePerHaYr: 0, isOxidationSubsidenceSevere: false };
  }

  // Delta range: Delta r = (lambda / (4 * pi)) * Delta phi
  // Subsidence in mm over temporal baseline
  const displacementCm = (radarWavelengthCm / (4.0 * Math.PI)) * phaseDifferenceRadians;
  const annualDisplacementMm = Number(((displacementCm * 10.0) * (365.25 / temporalBaselineDays)).toFixed(1));

  // In drained tropical peatlands, ~1.0 cm/yr (10 mm/yr) subsidence corresponds to ~9.1 t CO2 / ha / yr oxidation loss (Hooijer et al.)
  const positiveSubsidenceMm = Math.max(0, -annualDisplacementMm);
  const carbonLossTco2e = Number(((positiveSubsidenceMm / 10.0) * 9.1).toFixed(2));

  const isSevere = positiveSubsidenceMm >= 20.0; // >= 2 cm/yr rapid subsidence

  return {
    subsidenceRateMmPerYear: annualDisplacementMm,
    interferometricCoherenceGamma: interferometricCoherence,
    inferredCarbonLossTco2ePerHaYr: carbonLossTco2e,
    isOxidationSubsidenceSevere: isSevere,
  };
}
