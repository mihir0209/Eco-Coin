export interface RebalanceEvaluation {
  shouldRebalance: boolean;
  targetAllocationA: number;
  targetAllocationB: number;
  yieldSpread: number;
  reason: string;
}

export function computeOptimalAllocations(
  apyA: number,
  apyB: number,
  minYieldSpreadPct: number = 2.0
): RebalanceEvaluation {
  const spread = Math.abs(apyA - apyB);
  if (spread < minYieldSpreadPct) {
    return {
      shouldRebalance: false,
      targetAllocationA: 50,
      targetAllocationB: 50,
      yieldSpread: Number(spread.toFixed(2)),
      reason: `Yield spread (${spread.toFixed(2)}%) below rebalance threshold (${minYieldSpreadPct}%)`,
    };
  }

  // Weight higher APY pool more aggressively
  if (apyA > apyB) {
    return {
      shouldRebalance: true,
      targetAllocationA: 80,
      targetAllocationB: 20,
      yieldSpread: Number(spread.toFixed(2)),
      reason: `Rebalance to pool A yielding higher return (${apyA}% vs ${apyB}%)`,
    };
  } else {
    return {
      shouldRebalance: true,
      targetAllocationA: 20,
      targetAllocationB: 80,
      yieldSpread: Number(spread.toFixed(2)),
      reason: `Rebalance to pool B yielding higher return (${apyB}% vs ${apyA}%)`,
    };
  }
}
