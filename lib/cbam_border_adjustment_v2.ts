export function calculateCbamBorderAdjustmentV2(
  importedTons: number,
  productIntensityTco2ePerTon: number,
  euEtsBenchmarkIntensity: number,
  euAllowancePriceEur: number,
  originExplicitCarbonPriceEur: number
): { netCbamPayableEur: number; isBenchmarkCompliant: boolean; creditGrantedEur: number } {
  if (importedTons <= 0) {
    return { netCbamPayableEur: 0, isBenchmarkCompliant: true, creditGrantedEur: 0 };
  }
  const isBenchmarkCompliant = productIntensityTco2ePerTon <= euEtsBenchmarkIntensity;
  const taxableEmissionsPerTon = Math.max(0, productIntensityTco2ePerTon - euEtsBenchmarkIntensity);
  const totalTaxableTco2e = importedTons * taxableEmissionsPerTon;

  const grossDutyEur = totalTaxableTco2e * euAllowancePriceEur;
  const creditGrantedEur = Math.min(grossDutyEur, totalTaxableTco2e * originExplicitCarbonPriceEur);
  const netCbamPayableEur = Number(Math.max(0, grossDutyEur - creditGrantedEur).toFixed(2));

  return { netCbamPayableEur, isBenchmarkCompliant, creditGrantedEur: Number(creditGrantedEur.toFixed(2)) };
}
