import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LiquidityPool } from '@/models/LiquidityPool';
import User from '@/models/User';
import { AmmPoolEngine } from '@/lib/amm_pool';

let mongoServer: MongoMemoryServer;

beforeEach(async () => {
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
  await LiquidityPool.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('AMM Liquidity Pool & Automated Swapping Engine', () => {
  it('initializes a new AMM pool and computes constant product geometric shares', async () => {
    const pool = await AmmPoolEngine.createPool('eco-usdc-1', 'ECO-USDC', 10000, 5000, 'creator-1');
    expect(pool.poolId).toBe('eco-usdc-1');
    expect(pool.tokenAReserve).toBe(10000);
    expect(pool.tokenBReserve).toBe(5000);
    expect(pool.totalLpShares).toBeCloseTo(7071.0678, 2);
  });

  it('executes a swap from Token A to Token B adhering to constant product formula', async () => {
    await AmmPoolEngine.createPool('eco-usdc-1', 'ECO-USDC', 10000, 5000, 'creator-1');

    const user = await User.create({
      name: 'Trader Bob',
      email: 'trader@example.com',
      password: 'password123',
      totalEcoCoins: 2000,
    });

    const swapRes = await AmmPoolEngine.swap({
      poolId: 'eco-usdc-1',
      userId: user._id.toString(),
      inputToken: 'A',
      inputAmount: 1000,
      minOutputAmount: 400,
    });

    expect(swapRes.outputAmount).toBeGreaterThan(400);
    expect(swapRes.outputAmount).toBeLessThan(500);
    expect(swapRes.feeAmount).toBe(3); // 1000 * 0.003 (30 bps) = 3
    expect(swapRes.burnedAmount).toBe(0.5); // 1000 * 0.0005 (5 bps) = 0.5

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.totalEcoCoins).toBe(1000);
  });

  it('rejects a swap when output amount breaches slippage limit', async () => {
    await AmmPoolEngine.createPool('eco-usdc-1', 'ECO-USDC', 10000, 5000, 'creator-1');

    const user = await User.create({
      name: 'Trader Alice',
      email: 'alice@example.com',
      password: 'password123',
      totalEcoCoins: 2000,
    });

    await expect(
      AmmPoolEngine.swap({
        poolId: 'eco-usdc-1',
        userId: user._id.toString(),
        inputToken: 'A',
        inputAmount: 1000,
        minOutputAmount: 600, // Unrealistic expectation given pool depth
      })
    ).rejects.toThrow(/Slippage limit breached/);
  });

  it('supports adding and withdrawing liquidity with share tracking', async () => {
    await AmmPoolEngine.createPool('eco-usdc-1', 'ECO-USDC', 10000, 5000, 'creator-1');

    const addRes = await AmmPoolEngine.addLiquidity({
      poolId: 'eco-usdc-1',
      userId: 'lp-provider-2',
      amountA: 2000,
      amountB: 1000,
    });

    expect(addRes.mintedShares).toBeGreaterThan(0);
    expect(addRes.reserveA).toBe(12000);
    expect(addRes.reserveB).toBe(6000);

    const removeRes = await AmmPoolEngine.removeLiquidity({
      poolId: 'eco-usdc-1',
      userId: 'lp-provider-2',
      lpShares: addRes.mintedShares / 2,
    });

    expect(removeRes.amountA).toBeCloseTo(1000, 1);
    expect(removeRes.amountB).toBeCloseTo(500, 1);
  });
});
