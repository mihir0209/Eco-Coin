export interface HyperspectralCanopyStatus {
  nitrogenIndexNci: number;
  canopyChlorophyllContentIndex: number;
  defoliationStressDetected: boolean;
  canopyHealthTier: "VIGOROUS" | "MODERATE_STRESS" | "SEVERE_DEFOLIATION";
}

export function evaluateHyperspectralCanopyHealth(
  reflectanceRedEdge705Nm: number,
  reflectanceNearIr750Nm: number,
  reflectanceChlorophyllRed670Nm: number
): HyperspectralCanopyStatus {
  if (reflectanceNearIr750Nm <= 0 || reflectanceChlorophyllRed670Nm <= 0) {
    return { nitrogenIndexNci: 0, canopyChlorophyllContentIndex: 0, defoliationStressDetected: true, canopyHealthTier: "SEVERE_DEFOLIATION" };
  }

  // Normalized Canopy Index (NCI) = (R750 - R705) / (R750 + R705)
  const nci = Number(((reflectanceNearIr750Nm - reflectanceRedEdge705Nm) / (reflectanceNearIr750Nm + reflectanceRedEdge705Nm)).toFixed(3));
  // NDRE = (R750 - R705) / (R750 + R705), Red-edge chlorophyll ratio = R750 / R705
  const redRatio = Number((reflectanceNearIr750Nm / reflectanceRedEdge705Nm).toFixed(2));

  let tier: "VIGOROUS" | "MODERATE_STRESS" | "SEVERE_DEFOLIATION" = "VIGOROUS";
  let stress = false;

  if (nci < 0.20 || redRatio < 1.8) {
    tier = "SEVERE_DEFOLIATION";
    stress = true;
  } else if (nci < 0.35 || redRatio < 2.5) {
    tier = "MODERATE_STRESS";
    stress = true;
  }

  return {
    nitrogenIndexNci: nci,
    canopyChlorophyllContentIndex: redRatio,
    defoliationStressDetected: stress,
    canopyHealthTier: tier,
  };
}
