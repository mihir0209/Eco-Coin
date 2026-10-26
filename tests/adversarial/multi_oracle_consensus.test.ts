import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import MultiOracleSubmission from "@/models/MultiOracleSubmission";
import {
  generateOracleSignature,
  verifyOracleSignature,
  calculateMedian,
  filterOutliers,
  processMultiOracleConsensus,
} from "@/lib/multi_oracle_aggregator";

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
  await MultiOracleSubmission.deleteMany({});
});

describe("Adversarial Multi-Oracle Consensus & Aggregated ESG Verification Suite", () => {
  it("generates and verifies cryptographic oracle HMAC signatures", () => {
    const sig = generateOracleSignature("oracle-alpha", 1500, 750, 42);
    expect(sig).toBeDefined();
    expect(sig.length).toBe(64);

    const valid = verifyOracleSignature("oracle-alpha", 1500, 750, 42, sig);
    expect(valid).toBe(true);

    const tampered = verifyOracleSignature("oracle-alpha", 1501, 750, 42, sig);
    expect(tampered).toBe(false);
  });

  it("calculates accurate numerical medians across odd and even sample sizes", () => {
    expect(calculateMedian([10, 20, 30])).toBe(20);
    expect(calculateMedian([10, 20, 30, 40])).toBe(25);
    expect(calculateMedian([50])).toBe(50);
  });

  it("detects and filters malicious spoofed outlier readings beyond 15% variance", () => {
    const reports = [
      { oracleId: "o1", energyProducedKwh: 1000, carbonOffsetKg: 500, timestamp: new Date(), signature: "sig1" },
      { oracleId: "o2", energyProducedKwh: 1020, carbonOffsetKg: 510, timestamp: new Date(), signature: "sig2" },
      { oracleId: "o3", energyProducedKwh: 990, carbonOffsetKg: 495, timestamp: new Date(), signature: "sig3" },
      // Rogue oracle trying to mint 10x credits
      { oracleId: "o-rogue", energyProducedKwh: 10000, carbonOffsetKg: 5000, timestamp: new Date(), signature: "sig4" },
    ];

    const { validReports, outlierIds, medianEnergy, medianCarbon } = filterOutliers(reports, 15.0);
    expect(validReports.length).toBe(3);
    expect(outlierIds).toContain("o-rogue");
    expect(medianEnergy).toBe(1010);
  });

  it("approves multi-oracle submission when quorum and variance thresholds are satisfied", async () => {
    const submission = await MultiOracleSubmission.create({
      submissionId: "sub-solar-001",
      projectId: "solar-farm-bravo",
      epoch: 1,
      thresholdRequired: 3,
      reports: [
        { oracleId: "o1", energyProducedKwh: 5000, carbonOffsetKg: 2500, signature: "s1" },
        { oracleId: "o2", energyProducedKwh: 5050, carbonOffsetKg: 2525, signature: "s2" },
        { oracleId: "o3", energyProducedKwh: 4980, carbonOffsetKg: 2490, signature: "s3" },
      ],
      varianceThresholdPercent: 15.0,
    });

    const result = await processMultiOracleConsensus("sub-solar-001");
    expect(result.approved).toBe(true);
    expect(result.consensusEnergyKwh).toBe(5000);
    expect(result.consensusCarbonOffsetKg).toBe(2500);

    const updated = await MultiOracleSubmission.findOne({ submissionId: "sub-solar-001" });
    expect(updated?.status).toBe("approved");
  });

  it("disputes submission when outlier filtration drops valid report count below quorum threshold", async () => {
    await MultiOracleSubmission.create({
      submissionId: "sub-solar-002",
      projectId: "solar-farm-charlie",
      epoch: 2,
      thresholdRequired: 3,
      reports: [
        { oracleId: "o1", energyProducedKwh: 5000, carbonOffsetKg: 2500, signature: "s1" },
        { oracleId: "o2", energyProducedKwh: 5020, carbonOffsetKg: 2510, signature: "s2" },
        // Two colluding/faulty out-of-range oracles
        { oracleId: "o-faulty-1", energyProducedKwh: 9000, carbonOffsetKg: 4500, signature: "s3" },
        { oracleId: "o-faulty-2", energyProducedKwh: 1000, carbonOffsetKg: 500, signature: "s4" },
      ],
      varianceThresholdPercent: 15.0,
    });

    const result = await processMultiOracleConsensus("sub-solar-002");
    expect(result.approved).toBe(false);
    expect(result.outlierOracleIds.length).toBeGreaterThan(0);

    const updated = await MultiOracleSubmission.findOne({ submissionId: "sub-solar-002" });
    expect(updated?.status).toBe("disputed");
  });
});
