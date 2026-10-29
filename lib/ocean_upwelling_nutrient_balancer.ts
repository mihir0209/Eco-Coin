export interface UpwellingNutrientBalance {
  pumpedFlowRateM3PerSec: number;
  dissolvedNitrogenMmolPerM3: number;
  dissolvedPhosphorusMmolPerM3: number;
  redfieldRatioNToP: number;
  isRedfieldCompliant: boolean;
  harmfulAlgalBloomRisk: boolean;
}

export function balanceArtificialUpwellingNutrients(
  pumpedFlowRateM3PerSec: number,
  measuredDeepDinUmolPerL: number, // Dissolved inorganic nitrogen (umol/L = mmol/m3)
  measuredDeepDipUmolPerL: number  // Dissolved inorganic phosphorus
): UpwellingNutrientBalance {
  if (pumpedFlowRateM3PerSec <= 0 || measuredDeepDipUmolPerL <= 0) {
    return { pumpedFlowRateM3PerSec: 0, dissolvedNitrogenMmolPerM3: 0, dissolvedPhosphorusMmolPerM3: 0, redfieldRatioNToP: 0, isRedfieldCompliant: false, harmfulAlgalBloomRisk: true };
  }

  // Canonical Redfield Ratio: N:P = 16:1 (molar)
  const ratio = Number((measuredDeepDinUmolPerL / measuredDeepDipUmolPerL).toFixed(2));
  const isCompliant = ratio >= 14.0 && ratio <= 18.0;
  // If N:P drops < 10 or spikes > 25, unbalanced nutrient regime stimulates harmful dinoflagellates
  const habRisk = ratio < 10.0 || ratio > 25.0;

  return {
    pumpedFlowRateM3PerSec,
    dissolvedNitrogenMmolPerM3: measuredDeepDinUmolPerL,
    dissolvedPhosphorusMmolPerM3: measuredDeepDipUmolPerL,
    redfieldRatioNToP: ratio,
    isRedfieldCompliant: isCompliant,
    harmfulAlgalBloomRisk: habRisk,
  };
}
