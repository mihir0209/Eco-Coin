export function calculateHeatPumpEmissionsSaved(
  heatOutputMwh: number,
  cop: number,
  fossilFuelFactorKgMwh: number = 240.0, // Natural gas boiler
  gridElectricityFactorKgMwh: number = 150.0 // Renewable/grid mix
): number {
  if (heatOutputMwh <= 0 || cop <= 1) return 0;
  const fossilEmissionsTons = (heatOutputMwh * fossilFuelFactorKgMwh) / 1000.0;
  const electricityUsedMwh = heatOutputMwh / cop;
  const heatPumpEmissionsTons = (electricityUsedMwh * gridElectricityFactorKgMwh) / 1000.0;
  return Number(Math.max(0, fossilEmissionsTons - heatPumpEmissionsTons).toFixed(2));
}
