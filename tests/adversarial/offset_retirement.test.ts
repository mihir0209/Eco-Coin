import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import RetirementCertificate from "@/models/RetirementCertificate";
import {
  mintRetirementCertificate,
  verifyRetirementCertificate,
  revokeRetirementCertificate,
} from "@/lib/offset_retirement";

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
  await RetirementCertificate.deleteMany({});
});

describe("Decentralized Carbon Offset Retirement Certificate Registry Suite", () => {
  it("mints an immutable retirement certificate with valid cryptographic SHA-256 anchoring", async () => {
    const cert = await mintRetirementCertificate(
      "cert-offset-999",
      "patagonia_brand",
      "Earth Restoration Fund",
      250.5, // 250.5 tCO2e
      "GOLD_STANDARD",
      "Scope 1 Logistics Carbon Neutrality"
    );

    expect(cert.certificateId).toBe("cert-offset-999");
    expect(cert.tonsRetired).toBe(250.5);
    expect(cert.certificateHash).toHaveLength(64); // Valid 64-char SHA256 hex
    expect(cert.status).toBe("minted");
  });

  it("successfully verifies authentic certificates against on-chain hash anchors", async () => {
    await mintRetirementCertificate(
      "cert-offset-999",
      "patagonia_brand",
      "Earth Restoration Fund",
      250.5,
      "GOLD_STANDARD",
      "Scope 1 Logistics Carbon Neutrality"
    );

    const cert = await RetirementCertificate.findOne({ certificateId: "cert-offset-999" });
    const res = await verifyRetirementCertificate("cert-offset-999", cert?.certificateHash);

    expect(res.valid).toBe(true);
    expect(res.certificate?.owner).toBe("patagonia_brand");
  });

  it("detects and rejects unauthorized cryptographic tampering with certificate data", async () => {
    await mintRetirementCertificate(
      "cert-offset-999",
      "patagonia_brand",
      "Earth Restoration Fund",
      250.5,
      "GOLD_STANDARD",
      "Scope 1 Logistics Carbon Neutrality"
    );

    // Malicious attacker attempts to edit tonsRetired in the database from 250.5 to 1000.0
    await RetirementCertificate.updateOne(
      { certificateId: "cert-offset-999" },
      { $set: { tonsRetired: 1000.0 } }
    );

    const res = await verifyRetirementCertificate("cert-offset-999");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Cryptographic tamper detected");
  });

  it("revokes certificates upon dispute and flags them as revoked", async () => {
    await mintRetirementCertificate(
      "cert-offset-999",
      "patagonia_brand",
      "Earth Restoration Fund",
      250.5,
      "GOLD_STANDARD",
      "Scope 1 Logistics Carbon Neutrality"
    );

    await revokeRetirementCertificate("cert-offset-999", "Fraudulent underlying Verra serials");

    const res = await verifyRetirementCertificate("cert-offset-999");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Certificate is revoked");
  });

  it("rejects non-positive tons or duplicate certificate registration", async () => {
    await expect(
      mintRetirementCertificate("cert-err", "owner", "beneficiary", -10, "VERRA", "reason")
    ).rejects.toThrow("strictly positive");

    await mintRetirementCertificate("cert-offset-dup", "owner", "beneficiary", 50, "VERRA", "reason");
    await expect(
      mintRetirementCertificate("cert-offset-dup", "owner", "beneficiary", 50, "VERRA", "reason")
    ).rejects.toThrow("already exists");
  });
});
