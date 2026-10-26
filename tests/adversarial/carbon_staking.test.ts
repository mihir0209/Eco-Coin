import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CarbonStaking from "@/models/CarbonStaking";
import { delegateCarbonStake, auditAndSettleStake } from "@/lib/carbon_staking";

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
  await CarbonStaking.deleteMany({});
});

describe("Carbon Footprint Staking & Slashing Engine", () => {
  it("successfully delegates initial carbon performance stake", async () => {
    const res = await delegateCarbonStake("0xEntityA", 1000, 500);
    expect(res.success).toBe(true);
    expect(res.staking?.stakedAmount).toBe(1000);
    expect(res.staking?.emissionTargetKg).toBe(500);
    expect(res.staking?.status).toBe("ACTIVE");
  });

  it("awards 5% green yield when audited emissions meet target", async () => {
    await delegateCarbonStake("0xEntityB", 2000, 400);
    const res = await auditAndSettleStake("0xEntityB", 350, "test_secret_key");
    expect(res.success).toBe(true);
    expect(res.reward).toBe(100); // 5% of 2000
    expect(res.staking?.stakedAmount).toBe(2100);
    expect(res.staking?.epoch).toBe(2);
  });

  it("slashes staked collateral when audited emissions exceed target", async () => {
    await delegateCarbonStake("0xEntityC", 1000, 500);
    // Excess = 750 - 500 = 250 kg (50% excess -> 25% slash)
    const res = await auditAndSettleStake("0xEntityC", 750, "test_secret_key");
    expect(res.success).toBe(true);
    expect(res.slashed).toBe(250);
    expect(res.staking?.stakedAmount).toBe(750);
    expect(res.staking?.slashedAmount).toBe(250);
  });

  it("rejects staking with negative values or invalid parameters", async () => {
    await expect(delegateCarbonStake("0xEntityD", -100, 500)).rejects.toThrow();
    await expect(delegateCarbonStake("0xEntityD", 100, -500)).rejects.toThrow();
  });
});
