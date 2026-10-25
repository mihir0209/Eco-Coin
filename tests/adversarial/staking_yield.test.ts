import { describe, it, expect, beforeAll, afterAll } from "vitest";
import connectDB, { disconnectDB } from "@/lib/mongodb";
import User from "@/models/User";
import StakePosition from "@/models/StakePosition";
import Transaction from "@/models/Transaction";
import {
  createStakePosition,
  unstakePosition,
  calculatePositionYield,
  slashPoolPositions,
  STAKING_POOLS,
} from "@/lib/staking_engine";
import { POST as stakeHandler } from "@/app/api/staking/stake/route";
import { POST as unstakeHandler } from "@/app/api/staking/unstake/route";
import { NextRequest } from "next/server";

describe("Adversarial Carbon Staking & Yield Governance Suite", () => {
  beforeAll(async () => {
    await connectDB();
    await User.init();
    await StakePosition.init();
    await Transaction.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("accurately calculates matured carbon yield with project multiplier", async () => {
    const user = await User.create({
      name: "Green Investor",
      email: `yield_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 1000,
    });

    const position = await createStakePosition({
      userId: user._id.toString(),
      poolId: "reforestation-amazon",
      amount: 100,
      lockPeriodDays: 365,
    });

    expect(position.status).toBe("active");
    expect(position.amount).toBe(100);

    // Verify user balance was debited
    const refreshedUser = await User.findById(user._id);
    expect(refreshedUser?.totalEcoCoins).toBe(900);

    // Simulate maturity after 365 days
    const maturityDate = new Date(position.maturityDate.getTime() + 1000);
    const yieldCalc = calculatePositionYield(position, maturityDate);

    expect(yieldCalc.eligibleForWithdrawal).toBe(true);
    expect(yieldCalc.earlyWithdrawalPenalty).toBe(0);
    // Base APY 0.10 * multiplier 1.5 = 0.15 (15% yield on 100 = 15 coins)
    expect(yieldCalc.effectiveApy).toBeCloseTo(0.15, 2);
    expect(yieldCalc.accruedYield).toBe(15);
    expect(yieldCalc.netPayout).toBe(115);

    // Unstake position
    const unstakeResult = await unstakePosition({
      positionId: position._id.toString(),
      userId: user._id.toString(),
      asOfDate: maturityDate,
    });

    expect(unstakeResult.yieldEarned).toBe(15);
    expect(unstakeResult.penalty).toBe(0);
    expect(unstakeResult.returnAmount).toBe(115);

    const finalUser = await User.findById(user._id);
    expect(finalUser?.totalEcoCoins).toBe(900 + 115);
  });

  it("penalizes early withdrawal by 15% and forfeits unvested yield", async () => {
    const user = await User.create({
      name: "Impatient Staker",
      email: `early_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 500,
    });

    const position = await createStakePosition({
      userId: user._id.toString(),
      poolId: "solar-sahara",
      amount: 100,
      lockPeriodDays: 180,
    });

    // Attempt unstake without forceEarly at day 10
    const day10 = new Date(position.startDate.getTime() + 10 * 24 * 60 * 60 * 1000);

    await expect(
      unstakePosition({
        positionId: position._id.toString(),
        userId: user._id.toString(),
        forceEarly: false,
        asOfDate: day10,
      })
    ).rejects.toThrow(/not reached maturity/);

    // Unstake with forceEarly: true
    const earlyResult = await unstakePosition({
      positionId: position._id.toString(),
      userId: user._id.toString(),
      forceEarly: true,
      asOfDate: day10,
    });

    // 15% penalty on 100 = 15 coins deducted, 85 returned, 0 yield
    expect(earlyResult.penalty).toBe(15);
    expect(earlyResult.yieldEarned).toBe(0);
    expect(earlyResult.returnAmount).toBe(85);

    const userAfter = await User.findById(user._id);
    expect(userAfter?.totalEcoCoins).toBe(400 + 85);
  });

  it("rejects staking when user has insufficient balance or invalid lock periods", async () => {
    const poorUser = await User.create({
      name: "Low Balance User",
      email: `poor_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 5,
    });

    // Insufficient funds
    await expect(
      createStakePosition({
        userId: poorUser._id.toString(),
        poolId: "reforestation-amazon",
        amount: 50,
        lockPeriodDays: 30,
      })
    ).rejects.toThrow(/Insufficient Eco-Coins/);

    // Invalid lock period
    await expect(
      createStakePosition({
        userId: poorUser._id.toString(),
        poolId: "reforestation-amazon",
        amount: 25,
        lockPeriodDays: 45, // invalid
      })
    ).rejects.toThrow(/Invalid lock period/);
  });

  it("correctly executes governance slashing on audited pools", async () => {
    const userA = await User.create({
      name: "Staker A",
      email: `staker_a_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 500,
    });
    const userB = await User.create({
      name: "Staker B",
      email: `staker_b_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 500,
    });

    const targetPool = "mangrove-restoration";
    const posA = await createStakePosition({
      userId: userA._id.toString(),
      poolId: targetPool,
      amount: 100,
      lockPeriodDays: 90,
    });
    const posB = await createStakePosition({
      userId: userB._id.toString(),
      poolId: targetPool,
      amount: 200,
      lockPeriodDays: 90,
    });

    // Apply 20% governance slash due to faulty telemetry
    const slashResult = await slashPoolPositions({
      poolId: targetPool,
      slashRate: 0.20,
      reason: "Telemetry audit discrepancy",
    });

    expect(slashResult.affectedPositions).toBeGreaterThanOrEqual(2);

    const updatedA = await StakePosition.findById(posA._id);
    const updatedB = await StakePosition.findById(posB._id);

    expect(updatedA?.amount).toBe(80);
    expect(updatedB?.amount).toBe(160);
    expect(updatedA?.penaltyFeeBurned).toBe(20);
    expect(updatedB?.penaltyFeeBurned).toBe(40);
  });

  it("handles HTTP API routes for staking and unstaking seamlessly", async () => {
    const apiUser = await User.create({
      name: "API Tester",
      email: `api_stake_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 300,
    });

    // Stake via HTTP route
    const stakeReq = new NextRequest("http://localhost:3000/api/staking/stake", {
      method: "POST",
      body: JSON.stringify({
        userId: apiUser._id.toString(),
        poolId: "solar-sahara",
        amount: 50,
        lockPeriodDays: 30,
      }),
    });

    const stakeRes = await stakeHandler(stakeReq);
    expect(stakeRes.status).toBe(201);
    const stakeJson = await stakeRes.json();
    expect(stakeJson.success).toBe(true);
    const positionId = stakeJson.position._id;

    // Unstake via HTTP route (force early)
    const unstakeReq = new NextRequest("http://localhost:3000/api/staking/unstake", {
      method: "POST",
      body: JSON.stringify({
        positionId,
        userId: apiUser._id.toString(),
        forceEarly: true,
      }),
    });

    const unstakeRes = await unstakeHandler(unstakeReq);
    expect(unstakeRes.status).toBe(200);
    const unstakeJson = await unstakeRes.json();
    expect(unstakeJson.success).toBe(true);
    expect(unstakeJson.penalty).toBe(7.5); // 15% of 50
    expect(unstakeJson.returnAmount).toBe(42.5);

    // Double unstake should fail
    const replayRes = await unstakeHandler(unstakeReq);
    expect(replayRes.status).toBe(400);
  });
});
