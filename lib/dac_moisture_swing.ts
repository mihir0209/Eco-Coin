export function modelMoistureSwingDacDesorption(
  resinWeightKg: number,
  dryAmbientRelativeHumidityPct: number,
  chamberWetRelativeHumidityPct: number,
  quaternaryAmmoniumCapacityGramsPerKg: number = 40.0 // ~40g CO2 / kg dry resin
): { co2ReleasedKg: number; parasiticWaterLiters: number; thermalEnergySavedMwhVsThermal: number } {
  // Moisture-swing resins absorb CO2 in dry air (<30% RH) and release CO2 when wetted (>85% RH) at ambient temp
  if (resinWeightKg <= 0 || dryAmbientRelativeHumidityPct > 40.0 || chamberWetRelativeHumidityPct < 80.0) {
    return { co2ReleasedKg: 0, parasiticWaterLiters: 0, thermalEnergySavedMwhVsThermal: 0 };
  }
  const releaseFraction = (chamberWetRelativeHumidityPct - dryAmbientRelativeHumidityPct) / 100.0;
  const maxCapacityKg = (resinWeightKg * quaternaryAmmoniumCapacityGramsPerKg) / 1000.0;
  const co2ReleasedKg = Number((maxCapacityKg * releaseFraction).toFixed(2));

  // Water consumption: ~2.5 liters of warm water per kg of CO2 released
  const parasiticWaterLiters = Number((co2ReleasedKg * 2.5).toFixed(1));
  // Avoids thermal steam heating (standard thermal DAC consumes ~1.5 MWh heat per ton CO2 = 0.0015 MWh/kg)
  const thermalEnergySavedMwhVsThermal = Number(((co2ReleasedKg * 0.0015)).toFixed(3));

  return { co2ReleasedKg, parasiticWaterLiters, thermalEnergySavedMwhVsThermal };
}
