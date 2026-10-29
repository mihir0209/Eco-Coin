export interface AgroforestryStratificationResult {
  topsoilCarbonStockTco2ePerHa: number;    // 0-30 cm
  deepSubsoilCarbonStockTco2ePerHa: number; // 30-100 cm
  totalSoilCarbonStockTco2ePerHa: number;
  shadeCanopyMultiTierBonusPct: number;
}

export function traceAgroforestryCarbonStratification(
  areaHectares: number,
  canopyShadeCoveragePct: number, // e.g. 40%
  topsoilOrganicCarbonPct: number = 2.8,
  subsoilOrganicCarbonPct: number = 1.1
): AgroforestryStratificationResult {
  if (areaHectares <= 0) {
    return { topsoilCarbonStockTco2ePerHa: 0, deepSubsoilCarbonStockTco2ePerHa: 0, totalSoilCarbonStockTco2ePerHa: 0, shadeCanopyMultiTierBonusPct: 0 };
  }

  // Bulk densities: topsoil ~1.20 g/cm3, subsoil ~1.40 g/cm3
  // Topsoil (30cm layer) mass = 10,000 m2 * 0.30m * 1200 kg/m3 = 3600 tonnes soil / ha
  const topsoilCarbonTonnes = 3600.0 * (topsoilOrganicCarbonPct / 100.0);
  const topsoilCo2ePerHa = topsoilCarbonTonnes * (44.0 / 12.0);

  // Subsoil (70cm layer) mass = 10,000 m2 * 0.70m * 1400 kg/m3 = 9800 tonnes soil / ha
  const subsoilCarbonTonnes = 9800.0 * (subsoilOrganicCarbonPct / 100.0);
  const subsoilCo2ePerHa = subsoilCarbonTonnes * (44.0 / 12.0);

  // Multi-tier canopy root bonus: deeper tree roots stabilize subsoil carbon
  const bonusPct = canopyShadeCoveragePct >= 30.0 ? 15.0 : 5.0;
  const effectiveSubsoilCo2e = subsoilCo2ePerHa * (1.0 + bonusPct / 100.0);
  const totalStock = topsoilCo2ePerHa + effectiveSubsoilCo2e;

  return {
    topsoilCarbonStockTco2ePerHa: Number(topsoilCo2ePerHa.toFixed(2)),
    deepSubsoilCarbonStockTco2ePerHa: Number(effectiveSubsoilCo2e.toFixed(2)),
    totalSoilCarbonStockTco2ePerHa: Number(totalStock.toFixed(2)),
    shadeCanopyMultiTierBonusPct: bonusPct,
  };
}
