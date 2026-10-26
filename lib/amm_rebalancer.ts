import PoolRebalance, { IPoolRebalance } from "@/models/PoolRebalance";

export interface RebalanceMetrics {
  currentRatio: number;
  deviationBps: number;
  dynamicFeeBps: number;
  inventoryAdjustment: number;
  record?: IPoolRebalance;
}

export function computeDynamicFeeAndDeviation(
  baseReserve: number,
  quoteReserve: number,
  targetRatio: number
): { currentRatio: number; deviationBps: number; dynamicFeeBps: number; inventoryAdjustment: number } {
  if (baseReserve <= 0 || quoteReserve <= 0 || targetRatio <= 0) {
    throw new Error("Reserves and target ratio must be positive");
  }

  const currentRatio = quoteReserve / baseReserve;
  const ratioDelta = Math.abs(currentRatio - targetRatio);
  const deviationBps = Math.round((ratioDelta / targetRatio) * 10000);

  // Dynamic fee scaling: base 30 bps, scales up to 100 bps under extreme imbalance to curb toxic arbitrage
  let dynamicFeeBps = 30;
  if (deviationBps > 500) {
    // scale 1 bps per 20 bps of deviation past 500 bps
    dynamicFeeBps = Math.min(100, 30 + Math.floor((deviationBps - 500) / 20));
  }

  // Inventory adjustment: quantity needed to restore target ratio
  // targetRatio = (quoteReserve + deltaQuote) / baseReserve
  const desiredQuote = baseReserve * targetRatio;
  const inventoryAdjustment = Math.round((desiredQuote - quoteReserve) * 100) / 100;

  return {
    currentRatio,
    deviationBps,
    dynamicFeeBps,
    inventoryAdjustment,
  };
}

export async function executePoolRebalance(
  pairSymbol: string,
  baseReserve: number,
  quoteReserve: number,
  targetRatio: number
): Promise<RebalanceMetrics> {
  const metrics = computeDynamicFeeAndDeviation(baseReserve, quoteReserve, targetRatio);

  const record = await PoolRebalance.create({
    pairSymbol,
    baseReserve,
    quoteReserve,
    targetRatio,
    currentRatio: metrics.currentRatio,
    deviationBps: metrics.deviationBps,
    dynamicFeeBps: metrics.dynamicFeeBps,
    rebalanceAmount: metrics.inventoryAdjustment,
  });

  return {
    ...metrics,
    record,
  };
}
