import mongoose from "mongoose";
import StakePosition, { IStakePosition } from "@/models/StakePosition";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export interface StakingPoolConfig {
  id: string;
  name: string;
  baseApy: number; // e.g. 0.08 for 8%
  carbonYieldMultiplier: number;
  minStake: number;
}

export const STAKING_POOLS: Record<string, StakingPoolConfig> = {
  "reforestation-amazon": {
    id: "reforestation-amazon",
    name: "Amazon Canopy Reforestation",
    baseApy: 0.10,
    carbonYieldMultiplier: 1.5,
    minStake: 10,
  },
  "solar-sahara": {
    id: "solar-sahara",
    name: "Sahara Utility-Scale Solar Array",
    baseApy: 0.08,
    carbonYieldMultiplier: 1.25,
    minStake: 25,
  },
  "mangrove-restoration": {
    id: "mangrove-restoration",
    name: "Coastal Mangrove Blue Carbon",
    baseApy: 0.12,
    carbonYieldMultiplier: 1.75,
    minStake: 50,
  },
};

export const EARLY_WITHDRAWAL_PENALTY_RATE = 0.15; // 15% penalty on principal for early withdrawal

export interface YieldCalculationResult {
  accruedYield: number;
  eligibleForWithdrawal: boolean;
  earlyWithdrawalPenalty: number;
  netPayout: number;
  effectiveApy: number;
  elapsedDays: number;
}

export function calculatePositionYield(
  position: IStakePosition,
  asOfDate: Date = new Date()
): YieldCalculationResult {
  const startMs = new Date(position.startDate).getTime();
  const maturityMs = new Date(position.maturityDate).getTime();
  const currentMs = asOfDate.getTime();

  const elapsedMs = Math.max(0, Math.min(currentMs - startMs, maturityMs - startMs));
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const effectiveApy = position.apyBase * position.carbonYieldMultiplier;

  // Prorated annual yield based on elapsed time
  const accruedYield = Math.floor(position.amount * effectiveApy * (elapsedDays / 365) * 100) / 100;

  const isMatured = currentMs >= maturityMs;
  let penalty = 0;
  let netPayout = 0;

  if (isMatured) {
    penalty = 0;
    netPayout = position.amount + accruedYield;
  } else {
    // Early withdrawal penalty: 15% deducted from principal, unvested yield forfeited
    penalty = Math.floor(position.amount * EARLY_WITHDRAWAL_PENALTY_RATE * 100) / 100;
    netPayout = Math.max(0, position.amount - penalty);
  }

  return {
    accruedYield: isMatured ? accruedYield : 0,
    eligibleForWithdrawal: isMatured,
    earlyWithdrawalPenalty: penalty,
    netPayout,
    effectiveApy,
    elapsedDays: Math.floor(elapsedDays * 10) / 10,
  };
}

export async function createStakePosition(params: {
  userId: string;
  poolId: string;
  amount: number;
  lockPeriodDays: number;
}): Promise<IStakePosition> {
  const { userId, poolId, amount, lockPeriodDays } = params;

  const pool = STAKING_POOLS[poolId];
  if (!pool) {
    throw new Error(`Invalid staking pool ID: ${poolId}`);
  }

  if (![30, 90, 180, 365].includes(lockPeriodDays)) {
    throw new Error(`Invalid lock period: ${lockPeriodDays}. Must be 30, 90, 180, or 365 days.`);
  }

  if (amount < pool.minStake) {
    throw new Error(`Minimum stake for pool ${poolId} is ${pool.minStake} EcoCoins.`);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  if (user.totalEcoCoins < amount) {
    throw new Error(`Insufficient Eco-Coins. Required: ${amount}, Available: ${user.totalEcoCoins}`);
  }

  const startDate = new Date();
  const maturityDate = new Date(startDate.getTime() + lockPeriodDays * 24 * 60 * 60 * 1000);

  // Atomically debit user balance
  user.totalEcoCoins -= amount;
  await user.save();

  // Create stake position
  const position = await StakePosition.create({
    userId: user._id,
    poolId,
    amount,
    lockPeriodDays,
    apyBase: pool.baseApy,
    carbonYieldMultiplier: pool.carbonYieldMultiplier,
    startDate,
    maturityDate,
    status: "active",
  });

  // Log audit transaction
  await Transaction.create({
    userId: user._id,
    type: "redeem",
    amount,
    description: `Staked ${amount} EcoCoins into ${pool.name} (${lockPeriodDays} days lock)`,
  });

  return position;
}

export async function unstakePosition(params: {
  positionId: string;
  userId: string;
  forceEarly?: boolean;
  asOfDate?: Date;
}): Promise<{
  position: IStakePosition;
  returnAmount: number;
  yieldEarned: number;
  penalty: number;
}> {
  const { positionId, userId, forceEarly = false, asOfDate = new Date() } = params;

  const position = await StakePosition.findById(positionId);
  if (!position) {
    throw new Error("Staking position not found.");
  }

  if (position.userId.toString() !== userId) {
    throw new Error("Unauthorized: Cannot unstake another user position.");
  }

  if (position.status !== "active") {
    throw new Error(`Position is not active. Current status: ${position.status}`);
  }

  const calc = calculatePositionYield(position, asOfDate);

  if (!calc.eligibleForWithdrawal && !forceEarly) {
    throw new Error("Position has not reached maturity date yet. Pass forceEarly: true to confirm penalty withdrawal.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  position.status = "withdrawn";
  position.rewardsClaimed = calc.accruedYield;
  position.penaltyFeeBurned = calc.earlyWithdrawalPenalty;
  await position.save();

  // Credit user balance
  user.totalEcoCoins += calc.netPayout;
  await user.save();

  // Log transaction
  await Transaction.create({
    userId: user._id,
    type: "earn",
    amount: calc.netPayout,
    description: calc.earlyWithdrawalPenalty > 0
      ? `Early unstaked ${position.amount} EcoCoins (Penalty: ${calc.earlyWithdrawalPenalty}, Payout: ${calc.netPayout})`
      : `Unstaked ${position.amount} EcoCoins with ${calc.accruedYield} carbon yield rewards`,
  });

  return {
    position,
    returnAmount: calc.netPayout,
    yieldEarned: calc.accruedYield,
    penalty: calc.earlyWithdrawalPenalty,
  };
}

export async function slashPoolPositions(params: {
  poolId: string;
  slashRate: number; // e.g. 0.20 for 20%
  reason: string;
}): Promise<{
  affectedPositions: number;
  totalSlashedAmount: number;
}> {
  const { poolId, slashRate, reason } = params;
  if (slashRate <= 0 || slashRate > 1.0) {
    throw new Error("Slash rate must be between 0.0 and 1.0.");
  }

  const activePositions = await StakePosition.find({
    poolId,
    status: "active",
  });

  let totalSlashedAmount = 0;
  for (const pos of activePositions) {
    const slashAmount = Math.floor(pos.amount * slashRate * 100) / 100;
    pos.amount = Math.max(0, pos.amount - slashAmount);
    pos.penaltyFeeBurned += slashAmount;
    if (pos.amount === 0) {
      pos.status = "slashed";
    }
    await pos.save();
    totalSlashedAmount += slashAmount;
  }

  return {
    affectedPositions: activePositions.length,
    totalSlashedAmount,
  };
}
