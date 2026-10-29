export interface ReinsurancePayoutAssessment {
  isPayoutTriggered: boolean;
  payoutAmountUsd: number;
  payoutReason: string;
  remainingPoolReserveUsd: number;
}

export function evaluateParametricCatastrophePayout(
  sustainedWindSpeedKnots: number,
  soilMoistureDeficitPct: number,
  totalBufferReserveUsd: number,
  insuredProjectValueUsd: number
): ReinsurancePayoutAssessment {
  if (totalBufferReserveUsd <= 0 || insuredProjectValueUsd <= 0) {
    return { isPayoutTriggered: false, payoutAmountUsd: 0, payoutReason: "NO_ACTIVE_RESERVES", remainingPoolReserveUsd: 0 };
  }

  // Parametric triggers:
  // 1. Category 1+ Hurricane (sustained wind >= 64 knots) -> 40% payout of insured value
  // 2. Extreme Megadrought (soil moisture deficit >= 80%) -> 30% payout
  let payoutPct = 0;
  let reason = "NONE";

  if (sustainedWindSpeedKnots >= 64.0) {
    payoutPct = 40.0;
    reason = `PARAMETRIC_WIND_TRIGGER_${sustainedWindSpeedKnots}_KNOTS`;
  } else if (soilMoistureDeficitPct >= 80.0) {
    payoutPct = 30.0;
    reason = `PARAMETRIC_DROUGHT_TRIGGER_${soilMoistureDeficitPct}_PCT`;
  }

  const requestedPayout = (insuredProjectValueUsd * payoutPct) / 100.0;
  const actualPayout = Math.min(totalBufferReserveUsd, requestedPayout);
  const remaining = Number((totalBufferReserveUsd - actualPayout).toFixed(2));

  return {
    isPayoutTriggered: payoutPct > 0,
    payoutAmountUsd: Number(actualPayout.toFixed(2)),
    payoutReason: reason,
    remainingPoolReserveUsd: remaining,
  };
}
