export function calculateImpermanentLossHedge(
  initialPriceRatio: number,
  currentPriceRatio: number,
  lpLiquidityUsd: number,
  insurancePremiumBps: number = 50 // 0.5%
): { impermanentLossPct: number; lossAmountUsd: number; payoutUsd: number; netLpReturnUsd: number } {
  if (initialPriceRatio <= 0 || currentPriceRatio <= 0 || lpLiquidityUsd <= 0) {
    return { impermanentLossPct: 0, lossAmountUsd: 0, payoutUsd: 0, netLpReturnUsd: lpLiquidityUsd };
  }
  const k = currentPriceRatio / initialPriceRatio;
  // Standard IL formula = 2 * sqrt(k) / (1 + k) - 1
  const ilFraction = Math.max(0, 1.0 - (2.0 * Math.sqrt(k)) / (1.0 + k));
  const impermanentLossPct = Number((ilFraction * 100.0).toFixed(2));
  const lossAmountUsd = Number((lpLiquidityUsd * ilFraction).toFixed(2));

  // Insurance covers 80% of impermanent loss exceeding 2%
  let payoutUsd = 0;
  if (impermanentLossPct > 2.0) {
    payoutUsd = Number((lossAmountUsd * 0.8).toFixed(2));
  }
  const premiumUsd = (lpLiquidityUsd * insurancePremiumBps) / 10000.0;
  const netLpReturnUsd = Number((lpLiquidityUsd - lossAmountUsd + payoutUsd - premiumUsd).toFixed(2));

  return { impermanentLossPct, lossAmountUsd, payoutUsd, netLpReturnUsd };
}
