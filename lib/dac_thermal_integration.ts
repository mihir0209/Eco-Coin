export function calculateDacThermalEfficiency(
  grossCo2CapturedTons: number,
  sorbentRegenTempC: number,
  wasteHeatSuppliedMwh: number,
  parasiticElectricityMwh: number,
  gridEmissionFactorKgMwh: number = 180.0
): { netCo2CapturedTons: number; thermalEfficiencyRatio: number; parasiticFootprintTons: number } {
  if (grossCo2CapturedTons <= 0 || sorbentRegenTempC < 80.0) {
    return { netCo2CapturedTons: 0, thermalEfficiencyRatio: 0, parasiticFootprintTons: 0 };
  }
  // Standard solid sorbent regeneration requires ~1.5 MWh thermal per ton CO2
  const requiredThermalMwh = grossCo2CapturedTons * 1.5;
  const thermalEfficiencyRatio = Number((Math.min(1.0, wasteHeatSuppliedMwh / requiredThermalMwh)).toFixed(2));

  // Parasitic electricity emissions
  const parasiticFootprintTons = Number(((parasiticElectricityMwh * gridEmissionFactorKgMwh) / 1000.0).toFixed(2));
  const netCo2CapturedTons = Number(Math.max(0, grossCo2CapturedTons - parasiticFootprintTons).toFixed(2));

  return { netCo2CapturedTons, thermalEfficiencyRatio, parasiticFootprintTons };
}
