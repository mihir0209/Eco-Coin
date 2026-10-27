import CarbonSlippageGovernor, {
  ICarbonSlippageGovernor,
  IPriceSnapshot,
} from "../models/CarbonSlippageGovernor";

export interface SwapEvaluationResult {
  allowed: boolean;
  expectedOutput: number;
  effectivePrice: number;
  slippagePct: number;
  circuitBreakerTripped: boolean;
  reason?: string;
}

/**
 * Calculate Constant Product (x * y = k) AMM output with fee:
 * output = (reserveOut * amountIn * (1 - fee)) / (reserveIn + amountIn * (1 - fee))
 */
export function calculateAmmOutput(
  amountIn: number,
  reserveIn: number,
  reserveOut: number,
  feePct: number = 0.003 // 0.3% standard LP fee
): number {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    throw new Error("Invalid reserves or trade amount");
  }
  const effectiveIn = amountIn * (1 - feePct);
  const numerator = reserveOut * effectiveIn;
  const denominator = reserveIn + effectiveIn;
  return Number((numerator / denominator).toFixed(6));
}

/**
 * Compute slippage percentage relative to spot price:
 * Spot Price = reserveOut / reserveIn
 * Effective Price = output / amountIn
 * Slippage = (Spot - Effective) / Spot
 */
export function computeSlippage(
  amountIn: number,
  output: number,
  reserveIn: number,
  reserveOut: number
): number {
  const spotPrice = reserveOut / reserveIn;
  const effectivePrice = output / amountIn;
  const slippage = Math.max(0, (spotPrice - effectivePrice) / spotPrice);
  return Number((slippage * 100).toFixed(4)); // Percentage
}

/**
 * Inspect price volatility over a rolling window (e.g. 10 minutes).
 * Trips circuit breaker if price fluctuation exceeds threshold.
 */
export function checkVolatilityThreshold(
  history: IPriceSnapshot[],
  newPrice: number,
  windowMs: number = 600000, // 10 minutes
  thresholdPct: number = 15.0
): { tripped: boolean; maxDeltaPct: number } {
  const now = Date.now();
  const relevant = history.filter((h) => now - h.timestamp <= windowMs);
  if (relevant.length === 0) {
    return { tripped: false, maxDeltaPct: 0 };
  }

  let maxDeltaPct = 0;
  for (const snap of relevant) {
    const delta = Math.abs((newPrice - snap.price) / snap.price) * 100;
    if (delta > maxDeltaPct) {
      maxDeltaPct = delta;
    }
  }

  return {
    tripped: maxDeltaPct >= thresholdPct,
    maxDeltaPct: Number(maxDeltaPct.toFixed(2)),
  };
}

/**
 * Execute Governed Swap with Slippage Ceiling and Volatility Circuit Breaker.
 */
export async function evaluateAndExecuteSwap(
  poolId: string,
  amountIn: number,
  maxSlippageAllowedPct: number
): Promise<SwapEvaluationResult> {
  let pool = await CarbonSlippageGovernor.findOne({ poolId });
  if (!pool) {
    throw new Error(`Pool ${poolId} not found`);
  }

  // Check if currently under circuit breaker cooldown
  if (pool.isCircuitBreakerTripped) {
    if (pool.trippedUntil && new Date() < pool.trippedUntil) {
      return {
        allowed: false,
        expectedOutput: 0,
        effectivePrice: 0,
        slippagePct: 0,
        circuitBreakerTripped: true,
        reason: "Trading halted by volatility circuit breaker",
      };
    } else {
      // Cooldown expired; reset
      pool.isCircuitBreakerTripped = false;
      pool.trippedUntil = undefined;
    }
  }

  const output = calculateAmmOutput(amountIn, pool.reserveBase, pool.reserveQuote);
  const slippagePct = computeSlippage(amountIn, output, pool.reserveBase, pool.reserveQuote);

  if (slippagePct > maxSlippageAllowedPct) {
    return {
      allowed: false,
      expectedOutput: output,
      effectivePrice: output / amountIn,
      slippagePct,
      circuitBreakerTripped: false,
      reason: `Slippage (${slippagePct}%) exceeds maximum tolerance (${maxSlippageAllowedPct}%)`,
    };
  }

  const newBaseReserve = pool.reserveBase + amountIn;
  const newQuoteReserve = pool.reserveQuote - output;
  const newPrice = newQuoteReserve / newBaseReserve;

  // Check volatility over window
  const volCheck = checkVolatilityThreshold(
    pool.priceHistory,
    newPrice,
    600000,
    pool.circuitBreakerThresholdPct
  );

  if (volCheck.tripped) {
    pool.isCircuitBreakerTripped = true;
    pool.trippedUntil = new Date(Date.now() + 1800000); // 30 minute halt
    await pool.save();
    return {
      allowed: false,
      expectedOutput: output,
      effectivePrice: output / amountIn,
      slippagePct,
      circuitBreakerTripped: true,
      reason: `Volatility spike (${volCheck.maxDeltaPct}%) tripped circuit breaker`,
    };
  }

  // Update pool state
  pool.reserveBase = newBaseReserve;
  pool.reserveQuote = newQuoteReserve;
  pool.currentPrice = newPrice;
  pool.priceHistory.push({
    price: newPrice,
    timestamp: Date.now(),
    tradeVolume: amountIn,
  });

  // Keep last 100 price points
  if (pool.priceHistory.length > 100) {
    pool.priceHistory = pool.priceHistory.slice(-100);
  }

  await pool.save();

  return {
    allowed: true,
    expectedOutput: output,
    effectivePrice: output / amountIn,
    slippagePct,
    circuitBreakerTripped: false,
  };
}
