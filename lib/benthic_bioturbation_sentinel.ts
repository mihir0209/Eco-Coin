export interface BioturbationFluxStatus {
  biodiffusionCoefficientDbCm2Yr: number;
  sedimentMixingDepthCm: number;
  annualCarbonBurialFluxTco2ePerHa: number;
  isAnoxicBurialStable: boolean;
}

export function modelBenthicBioturbationFlux(
  macroinvertebrateAbundancePerM2: number, // polychaetes, bivalves
  bottomWaterDissolvedOxygenMgL: number = 3.5,
  sedimentationRateCmYr: number = 0.20
): BioturbationFluxStatus {
  if (macroinvertebrateAbundancePerM2 <= 0) {
    return { biodiffusionCoefficientDbCm2Yr: 0, sedimentMixingDepthCm: 0, annualCarbonBurialFluxTco2ePerHa: 0, isAnoxicBurialStable: true };
  }

  // Biodiffusion coefficient Db ~ 0.005 * Abundance^0.8 (typically 1 - 25 cm2/yr)
  const db = Number((0.005 * Math.pow(macroinvertebrateAbundancePerM2, 0.8)).toFixed(2));
  // Mixing depth L ~ 2.5 * sqrt(Db)
  const mixDepth = Number((2.5 * Math.sqrt(db)).toFixed(1));

  // If bottom water is severely hypoxic (< 2.0 mg/L), macrofauna mortality suppresses bioturbation -> enhances preservation
  const isHypoxicPreserved = bottomWaterDissolvedOxygenMgL < 2.0;

  // Carbon burial: higher sedimentation with controlled bioturbation preserves refractory POC
  const baseBurialTonnesCPerHa = sedimentationRateCmYr * 15.0 * (isHypoxicPreserved ? 1.3 : 0.85);
  const burialCo2e = Number((baseBurialTonnesCPerHa * (44.0 / 12.0)).toFixed(2));

  return {
    biodiffusionCoefficientDbCm2Yr: db,
    sedimentMixingDepthCm: mixDepth,
    annualCarbonBurialFluxTco2ePerHa: burialCo2e,
    isAnoxicBurialStable: isHypoxicPreserved || mixDepth <= 10.0,
  };
}
