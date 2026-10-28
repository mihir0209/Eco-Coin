export function calculateConcreteMineralizationCuring(
  concreteTons: number,
  co2InjectionPurityPct: number = 99.0,
  binderFractionPct: number = 14.0
): { permanentlyMineralizedCo2Kg: number; compressiveStrengthGainPct: number } {
  if (concreteTons <= 0) return { permanentlyMineralizedCo2Kg: 0, compressiveStrengthGainPct: 0 };
  // CO2 mineralizes with calcium silicate hydrate (CSH) into CaCO3: ~1.5% of total concrete weight
  const purity = co2InjectionPurityPct / 100.0;
  const binderFactor = binderFractionPct / 14.0;
  const mineralizedKgPerTon = 15.0 * purity * binderFactor;
  const permanentlyMineralizedCo2Kg = Number((concreteTons * mineralizedKgPerTon).toFixed(2));
  const compressiveStrengthGainPct = Number((Math.min(25.0, 10.0 + (permanentlyMineralizedCo2Kg / concreteTons) * 0.8)).toFixed(1));

  return { permanentlyMineralizedCo2Kg, compressiveStrengthGainPct };
}
