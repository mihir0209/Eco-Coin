export interface DynamicAmmFeeResult {
  baseFeeBps: number;
  dynamicFeeBps: number;
  volatilitySurchargeBps: number;
  isLvrProtected: boolean;
}

export function calculateDynamicVolatilityFee(
  historicalVolatilityAnnualPct: number, // e.g. 85.0%
  baseFeeBps: number = 30 // 0.30%
): DynamicAmmFeeResult {
  // Loss-Versus-Rebalancing (LVR) protection: scale fee quadratically with volatility
  let surchargeBps = 0;
  if (historicalVolatilityAnnualPct > 50.0) {
    const excessVol = historicalVolatilityAnnualPct - 50.0;
    surchargeBps = Math.min(100, Math.round(Math.pow(excessVol / 10.0, 1.5) * 5.0));
  }

  const dynamicFeeBps = baseFeeBps + surchargeBps;
  return {
    baseFeeBps,
    dynamicFeeBps,
    volatilitySurchargeBps: surchargeBps,
    isLvrProtected: surchargeBps > 0,
  };
}
