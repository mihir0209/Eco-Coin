import crypto from "crypto";
import { IDurabilityEscrow, RemovalType } from "@/models/DurabilityEscrow";

export interface CreateEscrowParams {
  projectId: string;
  removalType: RemovalType;
  durabilityYears: number;
  totalTonsLocked: number;
  totalEscrowTokens: number;
  milestoneIntervalYears: number;
}

export function buildDurabilityEscrow(params: CreateEscrowParams): Partial<IDurabilityEscrow> {
  if (params.durabilityYears < 20) {
    throw new Error("Durability permanence must be at least 20 years");
  }
  if (params.totalTonsLocked <= 0 || params.totalEscrowTokens <= 0) {
    throw new Error("Tons and tokens must be strictly positive");
  }
  if (params.milestoneIntervalYears <= 0 || params.milestoneIntervalYears > params.durabilityYears) {
    throw new Error("Invalid milestone interval: must be > 0 and <= durabilityYears");
  }

  const totalMilestones = Math.floor(params.durabilityYears / params.milestoneIntervalYears);
  const escrowId = `ESCROW-${params.removalType}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  return {
    escrowId,
    projectId: params.projectId,
    removalType: params.removalType,
    durabilityYears: params.durabilityYears,
    totalTonsLocked: params.totalTonsLocked,
    totalEscrowTokens: params.totalEscrowTokens,
    vestedTokens: 0,
    milestoneIntervalYears: params.milestoneIntervalYears,
    completedMilestones: 0,
    totalMilestones,
    status: "ACTIVE",
    slashedTokens: 0,
    createdAt: new Date(),
    lastVerifiedAt: new Date(),
  };
}

export function verifyPermanenceMilestone(
  escrow: Partial<IDurabilityEscrow>,
  sensorTelemetryAttestation: {
    sensorHash: string;
    leakageDetected: boolean;
    verificationDate: Date;
  }
): {
  tokensReleased: number;
  remainingLockedTokens: number;
  completedMilestones: number;
  isFullyVested: boolean;
} {
  if (escrow.status === "SLASHED") {
    throw new Error("Cannot verify milestone on slashed escrow");
  }
  if (escrow.status === "COMPLETED") {
    throw new Error("Escrow is already fully completed and vested");
  }
  if (sensorTelemetryAttestation.leakageDetected) {
    throw new Error("Verification failed: leakage or reversal detected in sensor telemetry");
  }
  if (!sensorTelemetryAttestation.sensorHash) {
    throw new Error("Valid sensor attestation hash required");
  }

  const totalMilestones = escrow.totalMilestones || 1;
  const currentCompleted = escrow.completedMilestones || 0;

  if (currentCompleted >= totalMilestones) {
    escrow.status = "COMPLETED";
    return {
      tokensReleased: 0,
      remainingLockedTokens: 0,
      completedMilestones: totalMilestones,
      isFullyVested: true,
    };
  }

  const tokensPerMilestone = (escrow.totalEscrowTokens || 0) / totalMilestones;
  const newCompleted = currentCompleted + 1;
  const tokensReleased = parseFloat(tokensPerMilestone.toFixed(4));
  const newVested = parseFloat(((escrow.vestedTokens || 0) + tokensReleased).toFixed(4));

  escrow.completedMilestones = newCompleted;
  escrow.vestedTokens = newVested;
  escrow.lastVerifiedAt = sensorTelemetryAttestation.verificationDate;

  const remaining = Math.max(0, (escrow.totalEscrowTokens || 0) - newVested);
  const isFullyVested = newCompleted >= totalMilestones;

  if (isFullyVested) {
    escrow.status = "COMPLETED";
  } else {
    escrow.status = "VERIFIED";
  }

  return {
    tokensReleased,
    remainingLockedTokens: parseFloat(remaining.toFixed(4)),
    completedMilestones: newCompleted,
    isFullyVested,
  };
}

export function triggerReversalSlashing(
  escrow: Partial<IDurabilityEscrow>,
  reason: string,
  slasherBeneficiary: string
): {
  slashedTokens: number;
  insurancePoolAllocation: number;
  slasherReward: number;
} {
  if (escrow.status === "SLASHED") {
    throw new Error("Escrow has already been slashed");
  }
  if (escrow.status === "COMPLETED") {
    throw new Error("Cannot slash completed escrow");
  }

  const totalTokens = escrow.totalEscrowTokens || 0;
  const alreadyVested = escrow.vestedTokens || 0;
  const remainingUnvested = Math.max(0, totalTokens - alreadyVested);

  if (remainingUnvested <= 0) {
    throw new Error("No unvested tokens remaining to slash");
  }

  // Slasher gets 10% bounty, 90% goes to carbon insurance buffer pool
  const slasherReward = parseFloat((remainingUnvested * 0.1).toFixed(4));
  const insurancePoolAllocation = parseFloat((remainingUnvested * 0.9).toFixed(4));

  escrow.status = "SLASHED";
  escrow.slashedTokens = remainingUnvested;
  escrow.slashingReason = reason;

  return {
    slashedTokens: remainingUnvested,
    insurancePoolAllocation,
    slasherReward,
  };
}
