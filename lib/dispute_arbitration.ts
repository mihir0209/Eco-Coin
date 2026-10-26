import EnvironmentalDispute, { IEnvironmentalDispute } from "@/models/EnvironmentalDispute";
import crypto from "crypto";

export interface DisputeResult {
  success: boolean;
  message: string;
  dispute?: IEnvironmentalDispute;
  verdict?: "UPHELD" | "DISMISSED" | "PENDING";
}

export async function raiseEnvironmentalDispute(
  challenger: string,
  targetEntity: string,
  claimType: "FALSE_ORACLE_DATA" | "DOUBLE_COUNTED_CREDIT" | "UNVERIFIED_GENERATION",
  evidenceData: string,
  challengerBond: number
): Promise<DisputeResult> {
  if (!challenger || !targetEntity || challengerBond < 100) {
    throw new Error("Dispute requires minimum bond of 100 tokens and valid parties");
  }

  const evidenceHash = crypto.createHash("sha256").update(evidenceData).digest("hex");
  const disputeId = `DISP-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

  const dispute = await EnvironmentalDispute.create({
    disputeId,
    challenger,
    targetEntity,
    claimType,
    evidenceHash,
    challengerBond,
    votes: [],
    status: "PENDING",
    quorumRequired: 3,
    penaltyAmount: challengerBond * 2,
  });

  return {
    success: true,
    message: "Environmental dispute registered and open for arbitration",
    dispute,
  };
}

export async function castJurorVote(
  disputeId: string,
  juror: string,
  approve: boolean,
  weight: number = 1
): Promise<DisputeResult> {
  const dispute = await EnvironmentalDispute.findOne({ disputeId, status: "PENDING" });
  if (!dispute) {
    throw new Error("Pending dispute not found");
  }

  if (dispute.votes.some((v) => v.juror === juror)) {
    throw new Error("Juror has already cast a vote on this dispute");
  }

  dispute.votes.push({ juror, approve, weight });

  // Check if quorum reached
  const totalVotes = dispute.votes.length;
  if (totalVotes >= dispute.quorumRequired) {
    const approvals = dispute.votes.filter((v) => v.approve).length;
    const rejections = totalVotes - approvals;

    if (approvals > rejections) {
      dispute.status = "UPHELD";
    } else {
      dispute.status = "DISMISSED";
    }
  }

  await dispute.save();

  return {
    success: true,
    message: `Juror vote recorded (${dispute.status})`,
    dispute,
    verdict: dispute.status,
  };
}
