export function calculateMassTimberSubstitutionSavings(
  cltVolumeM3: number,
  concreteDisplacedM3: number,
  steelDisplacedTons: number
): number {
  // CLT sequestered biogenic carbon: ~0.9 tCO2e/m3 CLT
  const sequesteredTons = cltVolumeM3 * 0.9;
  // Avoided emissions: ~0.35 tCO2e/m3 concrete + ~1.8 tCO2e/ton steel
  const avoidedConcrete = concreteDisplacedM3 * 0.35;
  const avoidedSteel = steelDisplacedTons * 1.8;
  return Number((sequesteredTons + avoidedConcrete + avoidedSteel).toFixed(2));
}
