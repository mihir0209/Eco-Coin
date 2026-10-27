export function calculateMicrogridTrade(
  energyKwh: number,
  ratePerKwh: number,
  lossFactor: number = 0.05
): { netDelivered: number; totalCost: number; gridLossKwh: number } {
  if (energyKwh <= 0 || ratePerKwh <= 0 || lossFactor < 0 || lossFactor >= 1) {
    throw new Error("Invalid microgrid trade parameters");
  }

  const gridLossKwh = Number((energyKwh * lossFactor).toFixed(4));
  const netDelivered = Number((energyKwh - gridLossKwh).toFixed(4));
  const totalCost = Number((netDelivered * ratePerKwh).toFixed(2));

  return { netDelivered, totalCost, gridLossKwh };
}
