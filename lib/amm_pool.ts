import { LiquidityPool, ILiquidityPool } from '@/models/LiquidityPool';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

export interface SwapParams {
  poolId: string;
  userId: string;
  inputToken: 'A' | 'B';
  inputAmount: number;
  minOutputAmount: number;
}

export interface AddLiquidityParams {
  poolId: string;
  userId: string;
  amountA: number;
  amountB: number;
  minLpShares?: number;
}

export interface RemoveLiquidityParams {
  poolId: string;
  userId: string;
  lpShares: number;
  minAmountA?: number;
  minAmountB?: number;
}

export class AmmPoolEngine {
  static async createPool(
    poolId: string,
    pair: string,
    initialA: number,
    initialB: number,
    creatorUserId: string
  ): Promise<ILiquidityPool> {
    if (initialA <= 0 || initialB <= 0) {
      throw new Error('Initial reserves must be greater than zero');
    }

    const existing = await LiquidityPool.findOne({ poolId });
    if (existing) {
      throw new Error(`Pool '${poolId}' already exists`);
    }

    const initialShares = Math.sqrt(initialA * initialB);

    const pool = await LiquidityPool.create({
      poolId,
      pair,
      tokenAReserve: initialA,
      tokenBReserve: initialB,
      totalLpShares: initialShares,
      lpPositions: [{ userId: creatorUserId, shares: initialShares }],
    });

    return pool;
  }

  static async swap(params: SwapParams): Promise<{
    outputAmount: number;
    feeAmount: number;
    burnedAmount: number;
    newReserveA: number;
    newReserveB: number;
  }> {
    const { poolId, userId, inputToken, inputAmount, minOutputAmount } = params;

    if (inputAmount <= 0) {
      throw new Error('Input amount must be positive');
    }

    const pool = await LiquidityPool.findOne({ poolId });
    if (!pool) {
      throw new Error(`Pool '${poolId}' not found`);
    }

    const isTokenA = inputToken === 'A';
    const inputReserve = isTokenA ? pool.tokenAReserve : pool.tokenBReserve;
    const outputReserve = isTokenA ? pool.tokenBReserve : pool.tokenAReserve;

    if (inputReserve <= 0 || outputReserve <= 0) {
      throw new Error('Insufficient liquidity in pool');
    }

    // Fee calculation (basis points out of 10000)
    const totalFeeRate = pool.feeNumerator / 10000;
    const burnFeeRate = pool.burnNumerator / 10000;

    const totalFee = inputAmount * totalFeeRate;
    const burnedAmount = inputAmount * burnFeeRate;
    const effectiveInput = inputAmount - totalFee;

    // Constant product formula: dy = (dx_eff * y) / (x + dx_eff)
    const outputAmount = (effectiveInput * outputReserve) / (inputReserve + effectiveInput);

    if (outputAmount < minOutputAmount) {
      throw new Error(
        `Slippage limit breached: output ${outputAmount.toFixed(4)} is less than minimum ${minOutputAmount}`
      );
    }

    if (outputAmount >= outputReserve) {
      throw new Error('Output amount exceeds pool reserve capacity');
    }

    // Update reserves
    if (isTokenA) {
      pool.tokenAReserve += inputAmount - burnedAmount;
      pool.tokenBReserve -= outputAmount;
    } else {
      pool.tokenBReserve += inputAmount - burnedAmount;
      pool.tokenAReserve -= outputAmount;
    }

    await pool.save();

    // Deduct user balance and credit output
    if (isTokenA) {
      // Swapping Eco-Coin (Token A) for Paired Token
      const user = await User.findById(userId);
      if (user) {
        if (user.totalEcoCoins < inputAmount) {
          throw new Error('Insufficient user Eco-Coin balance for swap');
        }
        user.totalEcoCoins -= inputAmount;
        await user.save();

        await Transaction.create({
          userId: user._id,
          amount: inputAmount,
          type: 'redeem',
          description: `AMM Swap: ${inputAmount} Eco-Coins for Token B in pool ${poolId}`,
        });
      }
    }

    return {
      outputAmount,
      feeAmount: totalFee,
      burnedAmount,
      newReserveA: pool.tokenAReserve,
      newReserveB: pool.tokenBReserve,
    };
  }

  static async addLiquidity(params: AddLiquidityParams): Promise<{
    mintedShares: number;
    totalShares: number;
    reserveA: number;
    reserveB: number;
  }> {
    const { poolId, userId, amountA, amountB, minLpShares = 0 } = params;
    if (amountA <= 0 || amountB <= 0) {
      throw new Error('Deposit amounts must be positive');
    }

    const pool = await LiquidityPool.findOne({ poolId });
    if (!pool) {
      throw new Error(`Pool '${poolId}' not found`);
    }

    // Shares = min((amountA / reserveA) * totalShares, (amountB / reserveB) * totalShares)
    const shareA = (amountA / pool.tokenAReserve) * pool.totalLpShares;
    const shareB = (amountB / pool.tokenBReserve) * pool.totalLpShares;
    const mintedShares = Math.min(shareA, shareB);

    if (mintedShares < minLpShares) {
      throw new Error(`Minted shares ${mintedShares.toFixed(4)} less than requested minimum ${minLpShares}`);
    }

    pool.tokenAReserve += amountA;
    pool.tokenBReserve += amountB;
    pool.totalLpShares += mintedShares;

    const existingPos = pool.lpPositions.find((p: any) => p.userId === userId);
    if (existingPos) {
      existingPos.shares += mintedShares;
    } else {
      pool.lpPositions.push({ userId, shares: mintedShares });
    }

    await pool.save();

    return {
      mintedShares,
      totalShares: pool.totalLpShares,
      reserveA: pool.tokenAReserve,
      reserveB: pool.tokenBReserve,
    };
  }

  static async removeLiquidity(params: RemoveLiquidityParams): Promise<{
    amountA: number;
    amountB: number;
    remainingShares: number;
  }> {
    const { poolId, userId, lpShares, minAmountA = 0, minAmountB = 0 } = params;
    if (lpShares <= 0) {
      throw new Error('LP shares to remove must be positive');
    }

    const pool = await LiquidityPool.findOne({ poolId });
    if (!pool) {
      throw new Error(`Pool '${poolId}' not found`);
    }

    const pos = pool.lpPositions.find((p: any) => p.userId === userId);
    if (!pos || pos.shares < lpShares) {
      throw new Error('Insufficient LP shares held by user');
    }

    const shareFraction = lpShares / pool.totalLpShares;
    const amountA = shareFraction * pool.tokenAReserve;
    const amountB = shareFraction * pool.tokenBReserve;

    if (amountA < minAmountA || amountB < minAmountB) {
      throw new Error('Redeemed token amounts below slippage threshold');
    }

    pos.shares -= lpShares;
    pool.totalLpShares -= lpShares;
    pool.tokenAReserve -= amountA;
    pool.tokenBReserve -= amountB;

    await pool.save();

    return {
      amountA,
      amountB,
      remainingShares: pos.shares,
    };
  }
}
