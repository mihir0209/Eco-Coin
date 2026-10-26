import FractionalPool, { IFractionalPool } from "@/models/FractionalCreditPool";

export interface SwapQuote {
  inputTokens: number;
  outputMicroCredits: number;
  feeTokens: number;
  effectivePricePerMicroCredit: number;
  priceImpactPercent: number;
}

export function createFractionalPoolData(
  poolId: string,
  name: string,
  certificateId: string,
  wholeCredits: number,
  initialTokens: number,
  feePercent: number = 0.3
): Partial<IFractionalPool> {
  if (wholeCredits <= 0 || initialTokens <= 0) {
    throw new Error("Pool reserves must be strictly positive");
  }

  const microCreditReserve = wholeCredits * 1000;
  const kConstant = microCreditReserve * initialTokens;

  return {
    poolId,
    name,
    certificateId,
    totalWholeCreditsLocked: wholeCredits,
    microCreditReserve,
    tokenReserve: initialTokens,
    kConstant,
    feePercent,
    endowmentAccumulatedTokens: 0,
    createdAt: new Date(),
  };
}

export function computeSwapTokensForMicroCredits(
  pool: { microCreditReserve: number; tokenReserve: number; feePercent: number },
  tokensIn: number,
  maxSlippagePercent: number = 5.0
): SwapQuote {
  if (tokensIn <= 0) {
    throw new Error("Input token amount must be positive");
  }

  const fee = tokensIn * (pool.feePercent / 100);
  const netTokensIn = tokensIn - fee;

  const currentSpotPrice = pool.tokenReserve / pool.microCreditReserve;

  // x * y = k => (tokenReserve + netTokensIn) * (microCreditReserve - outputMicroCredits) = k
  const newMicroCreditReserve = (pool.tokenReserve * pool.microCreditReserve) / (pool.tokenReserve + netTokensIn);
  const outputMicroCredits = pool.microCreditReserve - newMicroCreditReserve;

  if (outputMicroCredits <= 0 || outputMicroCredits >= pool.microCreditReserve) {
    throw new Error("Swap exceeds available liquidity");
  }

  const effectivePrice = tokensIn / outputMicroCredits;
  const priceImpact = Math.max(0, ((effectivePrice - currentSpotPrice) / currentSpotPrice) * 100);

  if (priceImpact > maxSlippagePercent) {
    throw new Error(`Slippage limit exceeded: price impact ${priceImpact.toFixed(2)}% > max allowed ${maxSlippagePercent}%`);
  }

  return {
    inputTokens: tokensIn,
    outputMicroCredits: Math.floor(outputMicroCredits * 100) / 100,
    feeTokens: Math.round(fee * 1000) / 1000,
    effectivePricePerMicroCredit: effectivePrice,
    priceImpactPercent: priceImpact,
  };
}

export async function executeFractionalSwap(
  poolId: string,
  tokensIn: number,
  maxSlippagePercent: number = 5.0
): Promise<SwapQuote & { newMicroCreditReserve: number; newTokenReserve: number }> {
  const pool = await FractionalPool.findOne({ poolId });
  if (!pool) {
    throw new Error(`Fractional pool ${poolId} not found`);
  }

  const quote = computeSwapTokensForMicroCredits(
    { microCreditReserve: pool.microCreditReserve, tokenReserve: pool.tokenReserve, feePercent: pool.feePercent },
    tokensIn,
    maxSlippagePercent
  );

  pool.tokenReserve += (tokensIn - quote.feeTokens);
  pool.endowmentAccumulatedTokens += quote.feeTokens;
  pool.microCreditReserve -= quote.outputMicroCredits;
  await pool.save();

  return {
    ...quote,
    newMicroCreditReserve: pool.microCreditReserve,
    newTokenReserve: pool.tokenReserve,
  };
}
