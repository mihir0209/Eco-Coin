import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import EnvironmentalDispute from "@/models/EnvironmentalDispute";
import { raiseEnvironmentalDispute, castJurorVote } from "@/lib/dispute_arbitration";

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
  await EnvironmentalDispute.deleteMany({});
});

describe("Environmental Dispute Arbitration DAO", () => {
  it("registers a valid environmental dispute with minimum bond", async () => {
    const res = await raiseEnvironmentalDispute(
      "0xChallenger1",
      "0xOracleBad",
      "FALSE_ORACLE_DATA",
      "Telemetry hash mismatch on 2026-10-25",
      250
    );
    expect(res.success).toBe(true);
    expect(res.dispute?.status).toBe("PENDING");
    expect(res.dispute?.evidenceHash).toBeDefined();
    expect(res.dispute?.challengerBond).toBe(250);
  });

  it("upholds dispute when majority of jurors vote approve upon reaching quorum", async () => {
    const init = await raiseEnvironmentalDispute(
      "0xChallenger2",
      "0xDoubleSpender",
      "DOUBLE_COUNTED_CREDIT",
      "Credit serial #999 already retired",
      200
    );
    const disputeId = init.dispute!.disputeId;

    await castJurorVote(disputeId, "0xJurorA", true);
    await castJurorVote(disputeId, "0xJurorB", false);
    const finalVote = await castJurorVote(disputeId, "0xJurorC", true);

    expect(finalVote.verdict).toBe("UPHELD");
    expect(finalVote.dispute?.votes.length).toBe(3);
  });

  it("dismisses dispute when majority rejects claims upon reaching quorum", async () => {
    const init = await raiseEnvironmentalDispute(
      "0xChallenger3",
      "0xLegitGenerator",
      "UNVERIFIED_GENERATION",
      "Unsubstantiated audit claims",
      150
    );
    const disputeId = init.dispute!.disputeId;

    await castJurorVote(disputeId, "0xJuror1", false);
    await castJurorVote(disputeId, "0xJuror2", false);
    const res = await castJurorVote(disputeId, "0xJuror3", true);

    expect(res.verdict).toBe("DISMISSED");
  });

  it("rejects duplicate votes from the same juror", async () => {
    const init = await raiseEnvironmentalDispute(
      "0xChallenger4",
      "0xOracleX",
      "FALSE_ORACLE_DATA",
      "Fake solar output",
      100
    );
    const disputeId = init.dispute!.disputeId;
    await castJurorVote(disputeId, "0xJurorDup", true);

    await expect(castJurorVote(disputeId, "0xJurorDup", true)).rejects.toThrow(
      "Juror has already cast a vote"
    );
  });
});
