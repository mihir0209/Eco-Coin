export interface CdpVaultStatus {
  collateralValueUsd: number;
  maxBorrowableUsd: number;
  currentLtvPct: number;
  liquidationRiskTier: "SAFE" | "WARNING" | "LIQUIDATION_ELIGIBLE";
}

export function evaluateCarbonCdpVault(
  forwardTco2eCollateral: number,
  spotCarbonPriceUsd: number,
  outstandingDebtUsd: number,
  vintageYearsUntilDelivery: number,
  baseMaxLtvPct: number = 65.0
): CdpVaultStatus {
  if (forwardTco2eCollateral <= 0 || spotCarbonPriceUsd <= 0) {
    return { collateralValueUsd: 0, maxBorrowableUsd: 0, currentLtvPct: 0, liquidationRiskTier: "LIQUIDATION_ELIGIBLE" };
  }

  // Forward vintage risk haircut: 5% haircut per year until future delivery
  const haircutFactor = Math.max(0.50, 1.0 - (vintageYearsUntilDelivery * 0.05));
  const effectivePrice = spotCarbonPriceUsd * haircutFactor;
  const collateralValueUsd = Number((forwardTco2eCollateral * effectivePrice).toFixed(2));

  const maxBorrowableUsd = Number((collateralValueUsd * (baseMaxLtvPct / 100.0)).toFixed(2));
  const currentLtvPct = collateralValueUsd > 0 ? Number(((outstandingDebtUsd / collateralValueUsd) * 100.0).toFixed(2)) : 999.0;

  let tier: "SAFE" | "WARNING" | "LIQUIDATION_ELIGIBLE" = "SAFE";
  if (currentLtvPct >= 80.0) {
    tier = "LIQUIDATION_ELIGIBLE";
  } else if (currentLtvPct >= 65.0) {
    tier = "WARNING";
  }

  return {
    collateralValueUsd,
    maxBorrowableUsd,
    currentLtvPct,
    liquidationRiskTier: tier,
  };
}
