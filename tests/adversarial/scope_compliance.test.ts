import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import ScopeCompliance from "@/models/ScopeCompliance";
import {
  determineEsgRating,
  computeTamperSeal,
  generateScopeComplianceReport,
  verifyComplianceTamperSeal,
} from "@/lib/scope_compliance";

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
  await ScopeCompliance.deleteMany({});
});

describe("Corporate Scope 1, 2, 3 Emissions Compliance & Audit Trail Suite", () => {
  it("determines tier rating based on emissions reduction ratio", () => {
    expect(determineEsgRating(10000, 0)).toBe("AAA"); // 100% net zero
    expect(determineEsgRating(10000, 1000)).toBe("AA"); // 90% offset
    expect(determineEsgRating(10000, 2500)).toBe("A"); // 75% offset
    expect(determineEsgRating(10000, 4500)).toBe("B"); // 55% offset
    expect(determineEsgRating(10000, 7000)).toBe("C"); // 30% offset
    expect(determineEsgRating(10000, 9500)).toBe("NON_COMPLIANT"); // < 25% offset
  });

  it("generates cryptographic SHA-256 tamper-evident seal", () => {
    const seal = computeTamperSeal("rep-101", "ent-corp-01", 2026, 50000, 10000, "AA");
    expect(seal).toBeDefined();
    expect(seal.length).toBe(64);
  });

  it("generates stateful compliance report with correct net emissions and ESG rating", async () => {
    const report = await generateScopeComplianceReport(
      "rep-2026-acme",
      "ent-acme-corp",
      2026,
      12000, // Scope 1
      18000, // Scope 2
      20000, // Scope 3 -> Gross = 50,000 kg
      45000  // Offsets -> Net = 5,000 kg (90% offset -> AA)
    );

    expect(report.grossEmissionsKg).toBe(50000);
    expect(report.netEmissionsKg).toBe(5000);
    expect(report.esgRating).toBe("AA");
    expect(verifyComplianceTamperSeal(report)).toBe(true);

    const fetched = await ScopeCompliance.findOne({ reportId: "rep-2026-acme" });
    expect(fetched).toBeDefined();
    expect(fetched?.grossEmissionsKg).toBe(50000);
  });

  it("detects tampering when emissions data is modified post-certification", async () => {
    const report = await generateScopeComplianceReport(
      "rep-2026-beta",
      "ent-beta-inc",
      2026,
      10000,
      10000,
      10000,
      30000 // 100% net zero -> AAA
    );

    expect(verifyComplianceTamperSeal(report)).toBe(true);

    // Malicious actor modifies stored gross emissions
    report.grossEmissionsKg = 99999;
    expect(verifyComplianceTamperSeal(report)).toBe(false);
  });
});
