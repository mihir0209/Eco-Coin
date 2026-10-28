export function calculateWaferFabricationScope3(
  waferAreaCm2: number,
  processNodeNanometers: number,
  pfcGwpAbatementPct: number = 90.0,
  cleanroomKwhPerCm2: number = 1.4
): { embodiedEmissionsKgCo2e: number; pfcEmissionsKgCo2e: number; totalScope3Tco2e: number } {
  if (waferAreaCm2 <= 0) {
    return { embodiedEmissionsKgCo2e: 0, pfcEmissionsKgCo2e: 0, totalScope3Tco2e: 0 };
  }
  // Smaller process nodes (<7nm) require multiple EUV exposures and higher energy intensity
  const complexityMultiplier = processNodeNanometers <= 7 ? 2.5 : (processNodeNanometers <= 14 ? 1.8 : 1.0);
  const electricityEmissionsKg = waferAreaCm2 * cleanroomKwhPerCm2 * complexityMultiplier * 0.45; // 0.45 kg/kWh

  // Process gases (NF3, CF4, SF6) have extreme GWP (>7000 to >22000)
  const unabatedPfcKgPerCm2 = 0.8 * complexityMultiplier;
  const pfcEmissionsKg = unabatedPfcKgPerCm2 * (1.0 - pfcGwpAbatementPct / 100.0) * waferAreaCm2;

  const totalKg = electricityEmissionsKg + pfcEmissionsKg;
  return {
    embodiedEmissionsKgCo2e: Number(electricityEmissionsKg.toFixed(2)),
    pfcEmissionsKgCo2e: Number(pfcEmissionsKg.toFixed(2)),
    totalScope3Tco2e: Number((totalKg / 1000.0).toFixed(4)),
  };
}
