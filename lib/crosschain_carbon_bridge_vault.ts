export interface BridgeReserveStatus {
  totalBridgedCreditsTco2e: number;
  lockedNativeReserveTco2e: number;
  reserveRatioPct: number;
  isFractionalReserveHealthy: boolean;
  rebalanceRequired: boolean;
}

export function auditCrossChainCarbonBridgeReserve(
  totalBridgedTokensIssued: number,
  lockedPhysicalCertsCount: number,
  minimumBackingRatioPct: number = 100.0
): BridgeReserveStatus {
  if (totalBridgedTokensIssued <= 0) {
    return { totalBridgedCreditsTco2e: 0, lockedNativeReserveTco2e: lockedPhysicalCertsCount, reserveRatioPct: 100.0, isFractionalReserveHealthy: true, rebalanceRequired: false };
  }

  const ratio = (lockedPhysicalCertsCount / totalBridgedTokensIssued) * 100.0;
  const isHealthy = ratio >= minimumBackingRatioPct;
  const needsRebalance = ratio < 100.0;

  return {
    totalBridgedCreditsTco2e: totalBridgedTokensIssued,
    lockedNativeReserveTco2e: lockedPhysicalCertsCount,
    reserveRatioPct: Number(ratio.toFixed(2)),
    isFractionalReserveHealthy: isHealthy,
    rebalanceRequired: needsRebalance,
  };
}
