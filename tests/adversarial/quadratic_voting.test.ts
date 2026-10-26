import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import QuadraticProposal from "@/models/QuadraticProposal";
import {
  computeQuadraticVotes,
  createQuadraticProposal,
  castQuadraticVote,
} from "@/lib/quadratic_voting";

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
  await QuadraticProposal.deleteMany({});
});

describe("Proof-of-Green Quadratic Governance & Sybil Resistance Suite", () => {
  it("calculates exact quadratic curve votes based on credits and voter tiers", () => {
    // 100 credits at Tier 2 (standard multiplier 1.0) -> sqrt(100) * 1.0 = 10
    expect(computeQuadraticVotes(100, 2)).toBe(10);

    // 400 credits at Tier 2 -> sqrt(400) * 1.0 = 20
    expect(computeQuadraticVotes(400, 2)).toBe(20);

    // 100 credits at Tier 1 (multiplier 0.5) -> sqrt(100) * 0.5 = 5
    expect(computeQuadraticVotes(100, 1)).toBe(5);

    // 100 credits at Tier 3 (staked multiplier 1.25) -> sqrt(100) * 1.25 = 12.5
    expect(computeQuadraticVotes(100, 3)).toBe(12.5);

    // Negative or 0 credits must be rejected
    expect(() => computeQuadraticVotes(0, 2)).toThrow("strictly positive");
    expect(() => computeQuadraticVotes(-50, 2)).toThrow("strictly positive");
  });

  it("neutralizes sybil splitting attacks via tiered multiplier gating", () => {
    // Attack scenario: Attacker has 100 ECO credits.
    // Legitimate Tier 2 account: 100 credits -> 10 votes
    const honestVotes = computeQuadraticVotes(100, 2);
    expect(honestVotes).toBe(10);

    // Sybil attack: Attacker creates 10 throwaway guest accounts (Tier 0), each with 10 credits
    let sybilVotesSum = 0;
    for (let i = 0; i < 10; i++) {
      sybilVotesSum += computeQuadraticVotes(10, 0);
    }

    // Each gives sqrt(10) * 0.25 = 0.79. Total for 10 accounts is 7.9.
    // Because 7.9 < 10, the sybil attack loses 21% of voting power!
    expect(sybilVotesSum).toBeLessThan(honestVotes);
  });

  it("creates a proposal and records quadratic votes incrementally", async () => {
    const proposal = await createQuadraticProposal(
      "prop-solar-001",
      "Fund Community Solar Microgrid",
      "Allocate 50,000 ECO to local solar array",
      "solar_consortium"
    );

    expect(proposal.proposalId).toBe("prop-solar-001");
    expect(proposal.status).toBe("active");

    // Voter 1 casts vote with 64 credits (sqrt(64) * 1.0 = 8)
    const receipt1 = await castQuadraticVote("prop-solar-001", "voter_alice", 64, 2);
    expect(receipt1.quadraticVotesAwarded).toBe(8);
    expect(receipt1.totalProposalVotes).toBe(8);

    // Voter 2 casts vote with 36 credits (sqrt(36) * 1.0 = 6)
    const receipt2 = await castQuadraticVote("prop-solar-001", "voter_bob", 36, 2);
    expect(receipt2.quadraticVotesAwarded).toBe(6);
    expect(receipt2.totalProposalVotes).toBe(14);
  });

  it("prevents double-voting on the same proposal by the same entity", async () => {
    await createQuadraticProposal(
      "prop-solar-002",
      "Biomass Facility",
      "Allocate 25,000 ECO",
      "biomass_consortium"
    );

    await castQuadraticVote("prop-solar-002", "voter_alice", 25, 2);

    await expect(
      castQuadraticVote("prop-solar-002", "voter_alice", 25, 2)
    ).rejects.toThrow("already cast their quadratic vote");
  });
});
