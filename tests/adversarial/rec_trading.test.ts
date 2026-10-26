import { describe, it, expect } from "vitest";
import {
  computeMeterMerkleRoot,
  signGeneratorTelemetry,
  buildRecRecord,
  executeRecSettlement,
  retireRecForCompliance,
} from "../../lib/rec_trading";

describe("Renewable Energy Certificate (REC) Minting & P2P Settlement Suite", () => {
  it("should compute deterministic Merkle root from smart meter telemetry", () => {
    const readings = [12.4, 15.2, 11.9, 14.1];
    const root1 = computeMeterMerkleRoot(readings);
    const root2 = computeMeterMerkleRoot(readings);
    expect(root1).toBe(root2);
    expect(root1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should fail Merkle root computation if meter readings array is empty", () => {
    expect(() => computeMeterMerkleRoot([])).toThrow("At least one meter reading required");
  });

  it("should mint a verifiable REC record with valid signature and status ACTIVE", () => {
    const rec = buildRecRecord({
      generatorId: "GEN-SOLAR-099",
      gridRegion: "ERCOT",
      energySource: "SOLAR",
      megawattHours: 50,
      meterReadings: [10, 15, 12, 13],
      vintageYear: 2026,
      ownerId: "user_generator_1",
    });

    expect(rec.recId).toMatch(/^REC-2026-[A-F0-9]{12}$/);
    expect(rec.gridRegion).toBe("ERCOT");
    expect(rec.energySource).toBe("SOLAR");
    expect(rec.megawattHours).toBe(50);
    expect(rec.status).toBe("ACTIVE");
    expect(rec.generatorSignature).toBeDefined();
  });

  it("should reject minting when megawattHours is zero or negative", () => {
    expect(() =>
      buildRecRecord({
        generatorId: "GEN-01",
        gridRegion: "CAISO",
        energySource: "WIND",
        megawattHours: -5,
        meterReadings: [5],
        vintageYear: 2026,
        ownerId: "user_1",
      })
    ).toThrow("megawattHours must be strictly positive");
  });

  it("should execute P2P trade with 0.5% protocol fee and transfer ownership", () => {
    const rec = buildRecRecord({
      generatorId: "GEN-WIND-001",
      gridRegion: "PJM",
      energySource: "WIND",
      megawattHours: 100,
      meterReadings: [25, 25, 25, 25],
      vintageYear: 2026,
      ownerId: "seller_alice",
    });

    const pricePerMwh = 20.0; // $2000 total + $10 fee = $2010
    const result = executeRecSettlement(rec, "buyer_bob", 2500, pricePerMwh);

    expect(result.success).toBe(true);
    expect(result.totalCost).toBe(2010.0);
    expect(result.protocolFee).toBe(10.0);
    expect(result.netSellerProceeds).toBe(2000.0);
    expect(rec.ownerId).toBe("buyer_bob");
  });

  it("should reject wash trading if buyer is the current owner", () => {
    const rec = buildRecRecord({
      generatorId: "GEN-WIND-001",
      gridRegion: "PJM",
      energySource: "WIND",
      megawattHours: 100,
      meterReadings: [25, 25, 25, 25],
      vintageYear: 2026,
      ownerId: "user_self",
    });

    expect(() =>
      executeRecSettlement(rec, "user_self", 5000, 15)
    ).toThrow("Wash trading prohibited");
  });

  it("should reject trade when buyer has insufficient balance", () => {
    const rec = buildRecRecord({
      generatorId: "GEN-HYDRO-01",
      gridRegion: "NYISO",
      energySource: "HYDRO",
      megawattHours: 100,
      meterReadings: [100],
      vintageYear: 2026,
      ownerId: "seller_alice",
    });

    expect(() =>
      executeRecSettlement(rec, "buyer_broke", 100, 30) // needs $3015
    ).toThrow("Insufficient buyer balance");
  });

  it("should retire REC for compliance and prevent double retirement", () => {
    const rec = buildRecRecord({
      generatorId: "GEN-GEO-01",
      gridRegion: "CAISO",
      energySource: "GEOTHERMAL",
      megawattHours: 20,
      meterReadings: [20],
      vintageYear: 2026,
      ownerId: "enterprise_corp",
    });

    const cert = retireRecForCompliance(rec, "enterprise_corp", "NetZero 2026 Initiative");
    expect(rec.status).toBe("RETIRED");
    expect(cert.retirementHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rec.retirementBeneficiary).toBe("NetZero 2026 Initiative");

    // Attempt second retirement
    expect(() =>
      retireRecForCompliance(rec, "enterprise_corp", "Duplicate Claim")
    ).toThrow("Certificate is already retired");
  });
});
