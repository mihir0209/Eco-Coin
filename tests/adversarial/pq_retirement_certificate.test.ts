import { describe, it, expect } from "vitest";
import {
  generateHybridCommitment,
  signClassical,
  signPostQuantum,
  issueCertificate,
  verifyDualSignatures,
  RetirementPayload,
} from "../../lib/pq_retirement_certificate";

describe("Post-Quantum Dual-Signature Retirement Certificate Suite", () => {
  const samplePayload: RetirementPayload = {
    certificateId: "PQ-CERT-2026-X99",
    projectId: "AMAZON-REFOREST-04",
    beneficiaryEntity: "Acme Sustainable Tech Corp",
    beneficiaryPublicKey: "pk_ed25519_88a4bc791d293f0b9912",
    auditorPublicKey: "pk_mldsa_c99021e8841a0293f18e",
    tonnesRetired: 1250.5,
  };

  const classicalSecret = "classical_auditor_secret_key_12345";
  const pqSecret = "lattice_mldsa_auditor_super_secure_key_at_least_32_bytes_long";

  // 1. Unit Tests
  describe("Unit Tests: Cryptographic Hashing and Signature Generation", () => {
    it("should deterministically generate hybrid SHA3-512 commitment", () => {
      const hash1 = generateHybridCommitment(samplePayload);
      const hash2 = generateHybridCommitment(samplePayload);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(128); // 512 bits hex = 128 chars
    });

    it("should reject negative or zero retirement tonnes", () => {
      expect(() =>
        generateHybridCommitment({ ...samplePayload, tonnesRetired: -10 })
      ).toThrow("Tonnes retired must be strictly positive");
      expect(() =>
        generateHybridCommitment({ ...samplePayload, tonnesRetired: 0 })
      ).toThrow("Tonnes retired must be strictly positive");
    });

    it("should enforce minimum 32-byte post-quantum key length for lattice security", () => {
      expect(() => signPostQuantum(samplePayload, "short_key")).toThrow(
        "Post-quantum secret key must be at least 32 bytes"
      );
    });
  });

  // 2. Integration Tests
  describe("Integration Tests: Certificate Issuance and Dual-Verification Lifecycle", () => {
    it("should issue a verified certificate with valid dual signatures", () => {
      const cert = issueCertificate(samplePayload, classicalSecret, pqSecret);
      expect(cert.status).toBe("VERIFIED");
      expect(cert.classicalSignature).toBeDefined();
      expect(cert.postQuantumSignature).toBeDefined();

      const verification = verifyDualSignatures(cert, classicalSecret, pqSecret);
      expect(verification.valid).toBe(true);
      expect(verification.error).toBeUndefined();
    });

    it("should reject verification when classical secret key is incorrect", () => {
      const cert = issueCertificate(samplePayload, classicalSecret, pqSecret);
      const verification = verifyDualSignatures(cert, "wrong_classical_secret", pqSecret);
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("Classical signature verification failed");
    });

    it("should reject verification when post-quantum secret key is incorrect", () => {
      const cert = issueCertificate(samplePayload, classicalSecret, pqSecret);
      const verification = verifyDualSignatures(
        cert,
        classicalSecret,
        "wrong_pq_secret_key_that_is_at_least_32_bytes_long"
      );
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("Post-quantum lattice signature verification failed");
    });
  });

  // 3. Regression & Adversarial Tests
  describe("Regression & Adversarial Tests: Tampering and Forgery Resistance", () => {
    it("should detect and reject tampering in tonnesRetired (inflation attack)", () => {
      const cert = issueCertificate(samplePayload, classicalSecret, pqSecret);
      const tampered = { ...cert, tonnesRetired: 50000.0 }; // Attacker attempts to claim 50,000 tonnes
      const res = verifyDualSignatures(tampered, classicalSecret, pqSecret);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Hybrid commitment hash mismatch");
    });

    it("should detect and reject tampering in beneficiary entity (identity hijacking)", () => {
      const cert = issueCertificate(samplePayload, classicalSecret, pqSecret);
      const tampered = { ...cert, beneficiaryEntity: "Malicious Co" };
      const res = verifyDualSignatures(tampered, classicalSecret, pqSecret);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Hybrid commitment hash mismatch");
    });

    it("should reject incomplete certificates missing cryptographic proofs", () => {
      const cert = issueCertificate(samplePayload, classicalSecret, pqSecret);
      const incomplete = { ...cert, postQuantumSignature: "" };
      const res = verifyDualSignatures(incomplete, classicalSecret, pqSecret);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Missing required certificate cryptographic fields");
    });
  });
});
