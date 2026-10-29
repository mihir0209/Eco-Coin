export interface CarbonBondYieldProfile {
  annualStakingYieldPct: number;
  accruedYieldUsd: number;
  slashingPenaltyOnDefaultUsd: number;
  isPermanenceDefaultTriggered: boolean;
}

export function calculateCarbonRemovalBondYield(
  stakedPrincipalUsd: number,
  tenorYears: number,
  monitoredPermanenceYearsAchieved: number,
  baseYieldPct: number = 7.5, // 7.5% APY base
  isPermanenceFailed: boolean = false
): CarbonBondYieldProfile {
  if (stakedPrincipalUsd <= 0 || tenorYears <= 0) {
    return { annualStakingYieldPct: 0, accruedYieldUsd: 0, slashingPenaltyOnDefaultUsd: 0, isPermanenceDefaultTriggered: false };
  }

  if (isPermanenceFailed) {
    // 100% principal slashing to refund buyer carbon insurance pool
    return {
      annualStakingYieldPct: 0,
      accruedYieldUsd: 0,
      slashingPenaltyOnDefaultUsd: stakedPrincipalUsd,
      isPermanenceDefaultTriggered: true,
    };
  }

  // Yield increases with verified permanence tenure: Y(t) = Y0 * (1 - e^(-0.2 * t))
  const tenureBonus = (1.0 - Math.exp(-0.25 * monitoredPermanenceYearsAchieved)) * 2.5;
  const effectiveYieldPct = Number((baseYieldPct + tenureBonus).toFixed(2));
  const accruedUsd = Number((stakedPrincipalUsd * (effectiveYieldPct / 100.0) * monitoredPermanenceYearsAchieved).toFixed(2));

  return {
    annualStakingYieldPct: effectiveYieldPct,
    accruedYieldUsd: accruedUsd,
    slashingPenaltyOnDefaultUsd: 0,
    isPermanenceDefaultTriggered: false,
  };
}
