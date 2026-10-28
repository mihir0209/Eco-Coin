export function optimizeFleetChargingDispatch(
  fleetVehicleCount: number,
  totalEnergyNeededKwh: number,
  gridMarginalEmissionFactors: number[] // hourly kg CO2 / MWh (e.g. 24 hours)
): { optimalHours: number[]; scheduledKwhPerHour: number; totalEstimatedCo2Kg: number } {
  if (fleetVehicleCount <= 0 || totalEnergyNeededKwh <= 0 || gridMarginalEmissionFactors.length === 0) {
    return { optimalHours: [], scheduledKwhPerHour: 0, totalEstimatedCo2Kg: 0 };
  }
  // Find the top 4 cleanest hours (lowest emission factors)
  const indexed = gridMarginalEmissionFactors.map((ef, idx) => ({ hour: idx, ef }));
  indexed.sort((a, b) => a.ef - b.ef);
  const selectedHours = indexed.slice(0, 4).map(item => item.hour).sort((a, b) => a - b);

  const kwhPerHour = Number((totalEnergyNeededKwh / 4.0).toFixed(2));
  const avgCleanEf = indexed.slice(0, 4).reduce((sum, item) => sum + item.ef, 0) / 4.0;
  // kg CO2 = (total kWh / 1000 MWh) * kg CO2/MWh
  const totalEstimatedCo2Kg = Number(((totalEnergyNeededKwh / 1000.0) * avgCleanEf).toFixed(2));

  return { optimalHours: selectedHours, scheduledKwhPerHour: kwhPerHour, totalEstimatedCo2Kg };
}
