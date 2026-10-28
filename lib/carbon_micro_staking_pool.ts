export interface MicroStakePosition {
  stakeId: string;
  userAddress: string;
  stakedTco2e: number;
  lockEpochSec: number;
  durationDays: number;
  claimedYieldUsd: number;
}

export function calculateMicroStakeYield(
  stakedTco2e: number,
  durationDays: number,
  carbonPriceUsd: number = 25.0,
  baseApyPct: number = 6.0
): { accruedYieldUsd: number; effectiveApyPct: number; totalMaturityValueUsd: number } {
  if (stakedTco2e <= 0 || durationDays <= 0 || carbonPriceUsd <= 0) {
    return { accruedYieldUsd: 0, effectiveApyPct: 0, totalMaturityValueUsd: 0 };
  }
  // Duration bonus multiplier: longer lockup yields up to +4% extra APY
  const durationBonus = Math.min(4.0, (durationDays / 365.0) * 4.0);
  const effectiveApyPct = Number((baseApyPct + durationBonus).toFixed(2));

  const principalUsd = stakedTco2e * carbonPriceUsd;
  const accruedYieldUsd = Number(((principalUsd * (effectiveApyPct / 100.0) * (durationDays / 365.0))).toFixed(2));
  const totalMaturityValueUsd = Number((principalUsd + accruedYieldUsd).toFixed(2));

  return { accruedYieldUsd, effectiveApyPct, totalMaturityValueUsd };
}
