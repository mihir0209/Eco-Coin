export function calculateOlivineDissolutionRate(
  olivineMassTons: number,
  grainDiameterMicrons: number,
  waterTempCelsius: number,
  seawaterPh: number = 8.1
): { annualCo2UptakeTco2e: number; specificSurfaceAreaM2PerTon: number; dissolutionYearsTo80Pct: number } {
  if (olivineMassTons <= 0 || grainDiameterMicrons <= 0) {
    return { annualCo2UptakeTco2e: 0, specificSurfaceAreaM2PerTon: 0, dissolutionYearsTo80Pct: 999.0 };
  }
  // Specific surface area scales inversely with grain diameter: SSA = 6 / (density * diameter)
  // Olivine density ~ 3.32 g/cm3 = 3320 kg/m3
  const diameterMeters = grainDiameterMicrons * 1e-6;
  const specificSurfaceAreaM2PerTon = Number(((6.0 / (3320.0 * diameterMeters)) * 1000.0).toFixed(1));

  // Rate of dissolution increases with temperature and finer grinding (Arrhenius activation Ea ~ 53 kJ/mol)
  const tempFactor = Math.pow(1.08, waterTempCelsius - 15.0);
  const sizeFactor = Math.max(0.1, 50.0 / grainDiameterMicrons);
  const dissolutionRateFractionPerYear = Math.min(0.35, 0.05 * tempFactor * sizeFactor);

  // Stoichiometry: 1 ton of pure forsterite olivine Mg2SiO4 captures ~1.1 to 1.25 tons CO2
  const annualDissolvedTons = olivineMassTons * dissolutionRateFractionPerYear;
  const annualCo2UptakeTco2e = Number((annualDissolvedTons * 1.15).toFixed(2));
  const dissolutionYearsTo80Pct = Number((0.80 / Math.max(0.001, dissolutionRateFractionPerYear)).toFixed(1));

  return { annualCo2UptakeTco2e, specificSurfaceAreaM2PerTon, dissolutionYearsTo80Pct };
}
