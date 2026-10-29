export interface BiocharStabilityAssessment {
  molarRatioHToCorg: number;
  isEbcCertifiedPermanent: boolean;
  estimatedSoilHalfLifeYears: number;
  permanenceTier: "PERMANENT_MILLENNIAL" | "CENTURY" | "UNQUALIFIED";
}

export function evaluateBiocharStability(
  hydrogenWeightPct: number,
  organicCarbonWeightPct: number,
  pyrolysisPeakTempCelsius: number
): BiocharStabilityAssessment {
  if (organicCarbonWeightPct <= 0 || hydrogenWeightPct < 0) {
    return {
      molarRatioHToCorg: 99.0,
      isEbcCertifiedPermanent: false,
      estimatedSoilHalfLifeYears: 0,
      permanenceTier: "UNQUALIFIED",
    };
  }

  // Atomic weights: H = 1.008 g/mol, C = 12.011 g/mol
  // Molar ratio H/Corg = (H% / 1.008) / (Corg% / 12.011)
  const molarH = hydrogenWeightPct / 1.008;
  const molarC = organicCarbonWeightPct / 12.011;
  const hToCorg = Number((molarH / molarC).toFixed(3));

  // European Biochar Certificate (EBC) & International Biochar Initiative (IBI):
  // H/Corg <= 0.70 guarantees aromatic condensation and >1000 yr persistence.
  // H/Corg <= 0.40 denotes premium high-temperature pyrolysis (>650C).
  let tier: "PERMANENT_MILLENNIAL" | "CENTURY" | "UNQUALIFIED" = "UNQUALIFIED";
  let halfLife = 50;

  if (hToCorg <= 0.40 && pyrolysisPeakTempCelsius >= 600) {
    tier = "PERMANENT_MILLENNIAL";
    halfLife = 2000;
  } else if (hToCorg <= 0.70) {
    tier = "PERMANENT_MILLENNIAL";
    halfLife = 1000;
  } else if (hToCorg <= 1.0) {
    tier = "CENTURY";
    halfLife = 100;
  }

  return {
    molarRatioHToCorg: hToCorg,
    isEbcCertifiedPermanent: hToCorg <= 0.70,
    estimatedSoilHalfLifeYears: halfLife,
    permanenceTier: tier,
  };
}
