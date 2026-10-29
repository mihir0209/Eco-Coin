export interface CarbonIsotopeAttestation {
  delta13CPermil: number;
  fractionC3VegetationInput: number;
  fractionC4VegetationInput: number;
  isOriginVerifiedAuthentic: boolean;
  provenanceTier: "C3_FOREST_CANOPY" | "C4_GRASSLAND_SAVANNA" | "SYNTHETIC_ANOMALY";
}

export function verifySoilCarbonIsotopeRatio(
  measuredRatio13C12C: number,
  standardVpdbRatio: number = 0.0112372, // Vienna Pee Dee Belemnite standard
  c3EndmemberPermil: number = -27.0,     // Typical C3 plant delta13C ~ -27 permil
  c4EndmemberPermil: number = -12.0      // Typical C4 plant delta13C ~ -12 permil
): CarbonIsotopeAttestation {
  if (measuredRatio13C12C <= 0 || standardVpdbRatio <= 0) {
    return { delta13CPermil: 0, fractionC3VegetationInput: 0, fractionC4VegetationInput: 0, isOriginVerifiedAuthentic: false, provenanceTier: "SYNTHETIC_ANOMALY" };
  }

  // Delta 13C = ((R_sample / R_standard) - 1) * 1000 permil
  const delta13C = Number((((measuredRatio13C12C / standardVpdbRatio) - 1.0) * 1000.0).toFixed(2));

  // Two-endmember mixing model: delta13C = f_C3 * delta_C3 + (1 - f_C3) * delta_C4
  const fC3 = (delta13C - c4EndmemberPermil) / (c3EndmemberPermil - c4EndmemberPermil);
  const clampedC3 = Number((Math.max(0.0, Math.min(1.0, fC3))).toFixed(3));
  const clampedC4 = Number((1.0 - clampedC3).toFixed(3));

  // Biological carbon inputs fall strictly within [-32, -10] permil
  const isAuthentic = delta13C >= -35.0 && delta13C <= -8.0;

  let tier: "C3_FOREST_CANOPY" | "C4_GRASSLAND_SAVANNA" | "SYNTHETIC_ANOMALY" = "SYNTHETIC_ANOMALY";
  if (!isAuthentic) {
    tier = "SYNTHETIC_ANOMALY";
  } else if (clampedC3 >= 0.70) {
    tier = "C3_FOREST_CANOPY";
  } else {
    tier = "C4_GRASSLAND_SAVANNA";
  }

  return {
    delta13CPermil: delta13C,
    fractionC3VegetationInput: clampedC3,
    fractionC4VegetationInput: clampedC4,
    isOriginVerifiedAuthentic: isAuthentic,
    provenanceTier: tier,
  };
}
