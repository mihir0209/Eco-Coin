import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import FractionalPool from "@/models/FractionalCreditPool";
import {
  createFractionalPoolData,
  computeSwapTokensForMicroCredits,
  executeFractionalSwap,
} from "@/lib/fractional_amm";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await FractionalPool.deleteMany({});
});

describe("Carbon Credit Fractionalization & Liquidity Pool AMM Suite", () => {
  it("initializes fractional pool with 1:1000 micro-credit reserve and invariant constant", () => {
    const data = createFractionalPoolData("pool-mangrove-1", "Mangrove Micro Pool", "cert-999", 50, 10000, 0.3);
    expect(data.microCreditReserve).toBe(50000); // 50 * 1000
    expect(data.tokenReserve).toBe(10000);
    expect(data.kConstant).toBe(50000 * 10000);
  });

  it("calculates exact constant-product swap quotes with protocol fee deduction", () => {
    const pool = { microCreditReserve: 50000, tokenReserve: 10000, feePercent: 0.3 };
    const quote = computeSwapTokensForMicroCredits(pool, 100, 5.0);

    expect(quote.inputTokens).toBe(100);
    expect(quote.feeTokens).toBe(0.3); // 0.3% of 100
    expect(quote.outputMicroCredits).toBeGreaterThan(0);
    expect(quote.priceImpactPercent).toBeLessThan(5.0);
  });

  it("aborts execution with slippage error when price impact exceeds maxSlippagePercent", () => {
    const pool = { microCreditReserve: 50000, tokenReserve: 10000, feePercent: 0.3 };
    // Huge token input on thin liquidity pool causes massive slippage
    expect(() => {
      computeSwapTokensForMicroCredits(pool, 5000, 2.0); // 50% liquidity pool swap
    }).toThrow(/Slippage limit exceeded/);
  });

  it("executes stateful swap, updating reserves and accumulating endowment fee", async () => {
    await FractionalPool.create({
      poolId: "pool-wind-01",
      name: "Wind Micro Pool",
      certificateId: "cert-wind-42",
      totalWholeCreditsLocked: 100,
      microCreditReserve: 100000,
      tokenReserve: 20000,
      kConstant: 100000 * 20000,
      feePercent: 0.3,
      endowmentAccumulatedTokens: 0,
    });

    const result = await executeFractionalSwap("pool-wind-01", 200, 5.0);
    expect(result.outputMicroCredits).toBeGreaterThan(0);
    expect(result.feeTokens).toBe(0.6);

    const updated = await FractionalPool.findOne({ poolId: "pool-wind-01" });
    expect(updated?.endowmentAccumulatedTokens).toBe(0.6);
    expect(updated?.tokenReserve).toBe(20000 + (200 - 0.6));
    expect(updated?.microCreditReserve).toBe(100000 - result.outputMicroCredits);
  });
});
