export function optimizeVirtualPowerPlantDispatch(
  prosumerBatteriesKwh: number[],
  gridStressIndex: number // 0.0 to 1.0
): { dispatchedKwh: number; revenueUsd: number; carbonGridReductionTons: number } {
  if (gridStressIndex < 0.2) {
    return { dispatchedKwh: 0, revenueUsd: 0, carbonGridReductionTons: 0 };
  }
  const totalStorage = prosumerBatteriesKwh.reduce((a, b) => a + b, 0);
  const dischargeFraction = Math.min(0.8, gridStressIndex * 0.9);
  const dispatchedKwh = Number((totalStorage * dischargeFraction).toFixed(2));
  // Higher stress = surge power pricing ($0.45/kWh) + peak peaker plant avoidance (0.7 kg CO2/kWh)
  const revenueUsd = Number((dispatchedKwh * 0.45).toFixed(2));
  const carbonGridReductionTons = Number(((dispatchedKwh * 0.70) / 1000.0).toFixed(2));
  return { dispatchedKwh, revenueUsd, carbonGridReductionTons };
}
