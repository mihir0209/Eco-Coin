import crypto from "crypto";
import VrfSequestrationLottery, {
  IVrfSequestrationLottery,
  IAuditorCandidate,
} from "../models/VrfSequestrationLottery";

export interface CreateLotteryInput {
  roundId: string;
  projectId: string;
  vrfSeedCommitment: string;
  minStakeRequired: number;
  candidates: IAuditorCandidate[];
}

export interface ResolveLotteryInput {
  roundId: string;
  revealedVrfSeed: string;
}

export interface LotteryResolutionResult {
  roundId: string;
  selectedAuditorId: string;
  vrfEntropyScore: number; // [0, 1)
  selectionProof: string;
  eligibleCandidatesCount: number;
}

/**
 * Generate a cryptographically secure VRF secret seed and its public commitment.
 */
export function generateVrfSeedPair(): { secretSeed: string; commitment: string } {
  const secretSeed = crypto.randomBytes(32).toString("hex");
  const commitment = crypto.createHash("sha256").update(secretSeed).digest("hex");
  return { secretSeed, commitment };
}

/**
 * Calculate effective voting weight for an auditor candidate:
 * weight = stakedTokens * (reputationScore / 100)
 */
export function calculateCandidateWeight(candidate: IAuditorCandidate, minStake: number): number {
  if (candidate.stakedTokens < minStake) {
    return 0; // Ineligible due to insufficient stake
  }
  return Math.max(0, candidate.stakedTokens * (candidate.reputationScore / 100));
}

/**
 * Deterministically compute VRF entropy float in [0, 1) given a seed and context message.
 */
export function evaluateVrf(secretSeed: string, context: string): { entropy: number; proof: string } {
  const hmac = crypto.createHmac("sha256", secretSeed);
  hmac.update(context);
  const proof = hmac.digest("hex");
  // Use first 8 bytes (64 bits) to construct a normalized float
  const slice = proof.substring(0, 16);
  const intVal = BigInt("0x" + slice);
  const maxVal = BigInt("0xFFFFFFFFFFFFFFFF");
  const entropy = Number(intVal) / Number(maxVal);
  return { entropy, proof };
}

/**
 * Select candidate via weighted sampling given normalized entropy float in [0, 1).
 */
export function selectCandidateByEntropy(
  candidates: IAuditorCandidate[],
  minStake: number,
  entropy: number
): { selected: IAuditorCandidate; proofEntropy: number } {
  const weighted = candidates.map((c) => ({
    candidate: c,
    weight: calculateCandidateWeight(c, minStake),
  }));

  const eligible = weighted.filter((w) => w.weight > 0);
  if (eligible.length === 0) {
    throw new Error("No eligible auditor candidates meet the minimum stake threshold");
  }

  const totalWeight = eligible.reduce((acc, curr) => acc + curr.weight, 0);
  let threshold = entropy * totalWeight;

  for (const item of eligible) {
    if (threshold <= item.weight) {
      return { selected: item.candidate, proofEntropy: entropy };
    }
    threshold -= item.weight;
  }

  return { selected: eligible[eligible.length - 1].candidate, proofEntropy: entropy };
}

/**
 * Commit a new VRF lottery round to the database.
 */
export async function commitVrfLotteryRound(input: CreateLotteryInput): Promise<IVrfSequestrationLottery> {
  if (!input.roundId || !input.projectId || !input.vrfSeedCommitment) {
    throw new Error("Missing required round metadata");
  }

  if (input.minStakeRequired <= 0) {
    throw new Error("minStakeRequired must be greater than zero");
  }

  if (!input.candidates || input.candidates.length === 0) {
    throw new Error("At least one candidate is required for lottery creation");
  }

  const existing = await VrfSequestrationLottery.findOne({ roundId: input.roundId });
  if (existing) {
    throw new Error(`Lottery round ${input.roundId} already exists`);
  }

  return await VrfSequestrationLottery.create({
    roundId: input.roundId,
    projectId: input.projectId,
    vrfSeedCommitment: input.vrfSeedCommitment,
    minStakeRequired: input.minStakeRequired,
    candidates: input.candidates,
    status: "COMMITTED",
  });
}

/**
 * Resolve a committed lottery round by verifying the revealed seed and picking the winning auditor.
 */
export async function resolveVrfLottery(input: ResolveLotteryInput): Promise<LotteryResolutionResult> {
  const round = await VrfSequestrationLottery.findOne({ roundId: input.roundId });
  if (!round) {
    throw new Error(`Round ${input.roundId} not found`);
  }

  if (round.status !== "COMMITTED") {
    throw new Error(`Round ${input.roundId} is already resolved or in status ${round.status}`);
  }

  // Verify commitment
  const computedHash = crypto.createHash("sha256").update(input.revealedVrfSeed).digest("hex");
  if (computedHash !== round.vrfSeedCommitment) {
    throw new Error("Revealed VRF seed does not match the committed hash");
  }

  const context = `${round.roundId}:${round.projectId}`;
  const { entropy, proof } = evaluateVrf(input.revealedVrfSeed, context);

  const { selected } = selectCandidateByEntropy(round.candidates, round.minStakeRequired, entropy);

  // Update round
  round.revealedVrfSeed = input.revealedVrfSeed;
  round.selectedAuditorId = selected.auditorId;
  round.selectionProof = proof;
  round.status = "RESOLVED";
  round.resolvedAt = new Date();

  // Mark candidate
  for (const c of round.candidates) {
    c.selectedAsAuditor = c.auditorId === selected.auditorId;
  }

  await round.save();

  const eligibleCount = round.candidates.filter(
    (c: IAuditorCandidate) => calculateCandidateWeight(c, round.minStakeRequired) > 0
  ).length;

  return {
    roundId: round.roundId,
    selectedAuditorId: selected.auditorId,
    vrfEntropyScore: entropy,
    selectionProof: proof,
    eligibleCandidatesCount: eligibleCount,
  };
}
