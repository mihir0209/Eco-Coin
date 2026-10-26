import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import PoolRebalance from "@/models/PoolRebalance";
import {
  computeDynamicFeeAndDeviation,
  executePoolRebalance,
} from "@/lib/amm_rebalancer";

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
  await PoolRebalance.deleteMany({});
});

describe("Eco-AMM Liquidity Rebalancing & Fee Protection", () => {
  it("maintains default 30 bps fee when pool is balanced near target ratio", () => {
    // 10,000 ECO : 10,000 USDC -> ratio = 1.0, target = 1.0 (0 bps deviation)
    const metrics = computeDynamicFeeAndDeviation(10000, 10000, 1.0);
    expect(metrics.deviationBps).toBe(0);
    expect(metrics.dynamicFeeBps).toBe(30);
    expect(metrics.inventoryAdjustment).toBe(0);
  });

  it("scales up dynamic fee to protect against arbitrageurs under high price deviation", () => {
    // 10,000 ECO : 12,000 USDC -> ratio = 1.2, target = 1.0 (2000 bps = 20% deviation)
    const metrics = computeDynamicFeeAndDeviation(10000, 12000, 1.0);
    expect(metrics.deviationBps).toBe(2000);
    // (2000 - 500) / 20 = 75 bps added -> capped at 100 bps
    expect(metrics.dynamicFeeBps).toBe(100);
    expect(metrics.inventoryAdjustment).toBe(-2000);
  });

  it("persists rebalance telemetry and records inventory recommendations", async () => {
    const res = await executePoolRebalance("ECO/USDC", 5000, 4500, 1.0);
    expect(res.record).toBeDefined();
    expect(res.record?.pairSymbol).toBe("ECO/USDC");
    expect(res.inventoryAdjustment).toBe(500); // needs 500 USDC to reach 1.0 ratio
  });

  it("rejects non-positive reserves with validation error", () => {
    expect(() => computeDynamicFeeAndDeviation(-100, 500, 1.0)).toThrow();
    expect(() => computeDynamicFeeAndDeviation(100, 0, 1.0)).toThrow();
  });
});
