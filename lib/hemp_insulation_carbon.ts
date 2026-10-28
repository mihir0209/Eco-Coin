export function calculateHempInsulationCarbonBenefit(
  hempVolumeM3: number,
  densityKgM3: number = 35.0,
  fiberCarbonContentPct: number = 44.0
): { sequesteredBiogenicCo2Kg: number; avoidedMineralWoolCo2Kg: number; netLcaCreditKg: number } {
  if (hempVolumeM3 <= 0) return { sequesteredBiogenicCo2Kg: 0, avoidedMineralWoolCo2Kg: 0, netLcaCreditKg: 0 };
  const dryMassKg = hempVolumeM3 * densityKgM3;
  // Biogenic sequestration: Carbon * (44 / 12)
  const sequesteredBiogenicCo2Kg = Number((dryMassKg * (fiberCarbonContentPct / 100.0) * (44.0 / 12.0)).toFixed(2));
  // Mineral wool emissions: ~1.2 kg CO2 / kg insulation displaced
  const avoidedMineralWoolCo2Kg = Number((dryMassKg * 1.2).toFixed(2));
  const netLcaCreditKg = Number((sequesteredBiogenicCo2Kg + avoidedMineralWoolCo2Kg).toFixed(2));

  return { sequesteredBiogenicCo2Kg, avoidedMineralWoolCo2Kg, netLcaCreditKg };
}
