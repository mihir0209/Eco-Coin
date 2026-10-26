import { QuadraticProposal, IQuadraticProposal } from "@/models/QuadraticProposal";

export interface QuadraticVoteReceipt {
  proposalId: string;
  voterId: string;
  creditsSpent: number;
  quadraticVotesAwarded: number;
  tier: number;
  totalProposalVotes: number;
}

export function computeQuadraticVotes(credits: number, tier: number): number {
  if (credits <= 0) {
    throw new Error("Credits spent must be strictly positive");
  }

  // Sybil resistance tier multipliers
  let multiplier = 0.25; // Tier 0 (unverified guest)
  if (tier === 1) multiplier = 0.5; // Tier 1 (email verified)
  else if (tier === 2) multiplier = 1.0; // Tier 2 (device / environmental attestation)
  else if (tier >= 3) multiplier = 1.25; // Tier 3 (staked green validator)

  const rawVotes = Math.sqrt(credits) * multiplier;
  return Math.round(rawVotes * 100) / 100;
}

export async function createQuadraticProposal(
  proposalId: string,
  title: string,
  description: string,
  creator: string,
  durationHours: number = 72
): Promise<IQuadraticProposal> {
  const existing = await QuadraticProposal.findOne({ proposalId });
  if (existing) {
    throw new Error(`Proposal with ID ${proposalId} already exists`);
  }

  const votingEnd = new Date(Date.now() + durationHours * 3600 * 1000);
  const proposal = new QuadraticProposal({
    proposalId,
    title,
    description,
    creator,
    status: "active",
    votingEnd,
    totalCreditsSpent: 0,
    totalQuadraticVotes: 0,
    votes: {},
  });

  return await proposal.save();
}

export async function castQuadraticVote(
  proposalId: string,
  voterId: string,
  credits: number,
  tier: number = 2
): Promise<QuadraticVoteReceipt> {
  const proposal = await QuadraticProposal.findOne({ proposalId });
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  if (proposal.status !== "active") {
    throw new Error(`Proposal is not active (current status: ${proposal.status})`);
  }

  if (new Date() > proposal.votingEnd) {
    proposal.status = proposal.totalQuadraticVotes >= 50 ? "passed" : "rejected";
    await proposal.save();
    throw new Error("Voting window for this proposal has closed");
  }

  const votesMap = proposal.votes || new Map();
  if (votesMap instanceof Map ? votesMap.has(voterId) : (votesMap as any)[voterId]) {
    throw new Error(`Voter ${voterId} has already cast their quadratic vote`);
  }

  const quadVotes = computeQuadraticVotes(credits, tier);

  proposal.totalCreditsSpent += credits;
  proposal.totalQuadraticVotes = Math.round((proposal.totalQuadraticVotes + quadVotes) * 100) / 100;

  if (votesMap instanceof Map) {
    votesMap.set(voterId, { credits, quadraticVotes: quadVotes, tier });
  } else {
    (votesMap as any)[voterId] = { credits, quadraticVotes: quadVotes, tier };
  }
  proposal.votes = votesMap;

  await proposal.save();

  return {
    proposalId,
    voterId,
    creditsSpent: credits,
    quadraticVotesAwarded: quadVotes,
    tier,
    totalProposalVotes: proposal.totalQuadraticVotes,
  };
}
