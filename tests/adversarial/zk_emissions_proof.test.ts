import { describe, it, expect } from "vitest";
import {
  generatePedersenCommitment,
  generateNullifier,
  createZkProof,
  verifyZkProof,
} from "../../lib/zk_emissions_proof";

describe("Zero-Knowledge Range Proof Verification Suite (lib/zk_emissions_proof.ts)", () => {
  const blinding = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  it("should generate deterministic commitments and nullifiers", () => {
    const c1 = generatePedersenCommitment(120.5, blinding);
    const c2 = generatePedersenCommitment(120.5, blinding);
    expect(c1).toBe(c2);
    expect(c1).toMatch(/^[a-f0-9]{64}$/);

    const n1 = generateNullifier("CORP-A", 2026, blinding);
    const n2 = generateNullifier("CORP-A", 2026, blinding);
    expect(n1).toBe(n2);
  });

  it("should create valid ZK compliance proof when actual emissions <= cap", () => {
    const proof = createZkProof({
      corporateEntityId: "CORP-TESLA",
      auditYear: 2026,
      actualEmissionsMt: 45000,
      emissionsCapMt: 50000,
      blindingFactorHex: blinding,
    });

    expect(proof.proofId).toMatch(/^ZK-PROOF-2026-[A-F0-9]{12}$/);
    expect(proof.verified).toBe(true);

    const used = new Set<string>();
    const verifyResult = verifyZkProof(proof, used);
    expect(verifyResult.valid).toBe(true);
  });

  it("should reject ZK proof creation when actual emissions exceed cap", () => {
    expect(() =>
      createZkProof({
        corporateEntityId: "CORP-DIRTY-COAL",
        auditYear: 2026,
        actualEmissionsMt: 95000,
        emissionsCapMt: 80000,
        blindingFactorHex: blinding,
      })
    ).toThrow("exceed cap");
  });

  it("should detect and reject replay attacks using already-spent nullifier hash", () => {
    const proof = createZkProof({
      corporateEntityId: "CORP-SOLAR",
      auditYear: 2026,
      actualEmissionsMt: 1000,
      emissionsCapMt: 5000,
      blindingFactorHex: blinding,
    });

    const used = new Set<string>();
    used.add(proof.nullifierHash!); // simulate previous submission

    const verifyResult = verifyZkProof(proof, used);
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toContain("Double-spending detected");
  });

  it("should fail verification if proof signature is tampered", () => {
    const proof = createZkProof({
      corporateEntityId: "CORP-HONEST",
      auditYear: 2026,
      actualEmissionsMt: 2000,
      emissionsCapMt: 3000,
      blindingFactorHex: blinding,
    });

    proof.emissionsCapMt = 1000; // Tamper cap post-proof
    const verifyResult = verifyZkProof(proof, new Set());
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toContain("Cryptographic proof signature mismatch");
  });
});
