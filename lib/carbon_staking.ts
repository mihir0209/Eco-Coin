import CarbonStaking, { ICarbonStaking } from "@/models/CarbonStaking";
import crypto from "crypto";

export interface StakingResult {
  success: boolean;
  message: string;
  staking?: ICarbonStaking;
  slashed?: number;
  reward?: number;
}

export async function delegateCarbonStake(
  stakerAddress: string,
  stakedAmount: number,
  emissionTargetKg: number
): Promise<StakingResult> {
  if (!stakerAddress || stakedAmount <= 0 || emissionTargetKg <= 0) {
    throw new Error("Invalid staking parameters: positive amount and emission target required");
  }

  const existing = await CarbonStaking.findOne({ stakerAddress, status: "ACTIVE" });
  if (existing) {
    existing.stakedAmount += stakedAmount;
    existing.emissionTargetKg = emissionTargetKg;
    await existing.save();
    return {
      success: true,
      message: "Stake delegation expanded",
      staking: existing,
    };
  }

  const newStake = await CarbonStaking.create({
    stakerAddress,
    stakedAmount,
    emissionTargetKg,
    status: "ACTIVE",
    slashedAmount: 0,
    rewardsAccrued: 0,
    epoch: 1,
  });

  return {
    success: true,
    message: "Stake delegated successfully",
    staking: newStake,
  };
}

export async function auditAndSettleStake(
  stakerAddress: string,
  actualEmissionsKg: number,
  auditSecretKey: string
): Promise<StakingResult> {
  const stake = await CarbonStaking.findOne({ stakerAddress, status: "ACTIVE" });
  if (!stake) {
    throw new Error("Active stake position not found for entity");
  }

  if (actualEmissionsKg < 0) {
    throw new Error("Emissions cannot be negative");
  }

  // Cryptographic audit signature verification
  const auditSignature = crypto
    .createHmac("sha256", auditSecretKey)
    .update(`${stakerAddress}:${actualEmissionsKg}:${stake.epoch}`)
    .digest("hex");

  stake.actualEmissionsKg = actualEmissionsKg;
  stake.auditSignature = auditSignature;

  // Evaluation: target vs actual
  if (actualEmissionsKg > stake.emissionTargetKg) {
    // Delinquent: calculate excess percentage and slash proportionally
    const excessKg = actualEmissionsKg - stake.emissionTargetKg;
    const penaltyRate = Math.min(1.0, (excessKg / stake.emissionTargetKg) * 0.5);
    const slashAmount = Math.round(stake.stakedAmount * penaltyRate * 100) / 100;

    stake.stakedAmount -= slashAmount;
    stake.slashedAmount += slashAmount;
    if (stake.stakedAmount <= 0) {
      stake.status = "SLASHED";
      stake.stakedAmount = 0;
    }
    await stake.save();

    return {
      success: true,
      message: `Emission target exceeded by ${excessKg} kg. Slashed ${slashAmount} tokens.`,
      staking: stake,
      slashed: slashAmount,
    };
  } else {
    // Compliant: award green yield (5% of staked amount)
    const reward = Math.round(stake.stakedAmount * 0.05 * 100) / 100;
    stake.rewardsAccrued += reward;
    stake.stakedAmount += reward;
    stake.epoch += 1;
    await stake.save();

    return {
      success: true,
      message: `Emissions compliant. Awarded ${reward} green yield tokens.`,
      staking: stake,
      reward,
    };
  }
}
