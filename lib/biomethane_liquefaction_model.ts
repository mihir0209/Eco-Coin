export function calculateBioLngDisplacement(
  bioLngTons: number,
  cryogenicKwhPerTon: number = 350.0,
  gridEmissionFactorKgKwh: number = 0.25
): { grossDieselReplacedLiters: number; netEmissionSavingsTco2e: number } {
  if (bioLngTons <= 0) return { grossDieselReplacedLiters: 0, netEmissionSavingsTco2e: 0 };
  // 1 ton Bio-LNG displaces ~1400 liters heavy diesel fuel
  const grossDieselReplacedLiters = bioLngTons * 1400.0;
  // Diesel produces ~2.68 kg CO2/L -> avoided gross
  const avoidedDieselTco2e = (grossDieselReplacedLiters * 2.68) / 1000.0;
  // Cryogenic cooling footprint
  const coolingEmissionTco2e = (bioLngTons * cryogenicKwhPerTon * gridEmissionFactorKgKwh) / 1000.0;

  const netEmissionSavingsTco2e = Number(Math.max(0, avoidedDieselTco2e - coolingEmissionTco2e).toFixed(2));
  return { grossDieselReplacedLiters, netEmissionSavingsTco2e };
}
