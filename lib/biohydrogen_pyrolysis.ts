export function calculateMethanePyrolysisBioHydrogen(
  feedstockCh4Kg: number,
  thermalConversionEfficiencyPct: number = 85.0
): { h2ProducedKg: number; solidCarbonBlackKg: number; avoidedCo2EmissionsKg: number } {
  if (feedstockCh4Kg <= 0 || thermalConversionEfficiencyPct <= 0) {
    return { h2ProducedKg: 0, solidCarbonBlackKg: 0, avoidedCo2EmissionsKg: 0 };
  }
  // Stoichiometry: CH4 -> C + 2 H2 (16g CH4 -> 12g C + 4g H2)
  const eff = thermalConversionEfficiencyPct / 100.0;
  const h2ProducedKg = Number((feedstockCh4Kg * (4.0 / 16.0) * eff).toFixed(2));
  const solidCarbonBlackKg = Number((feedstockCh4Kg * (12.0 / 16.0) * eff).toFixed(2));
  // Displacing Steam Methane Reforming (SMR produces ~9 kg CO2 / kg H2 without CCS)
  const avoidedCo2EmissionsKg = Number((h2ProducedKg * 9.0).toFixed(2));

  return { h2ProducedKg, solidCarbonBlackKg, avoidedCo2EmissionsKg };
}
