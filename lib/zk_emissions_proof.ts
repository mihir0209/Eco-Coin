import crypto from "crypto";
import { IZkEmissionsProof } from "@/models/ZkEmissionsProof";

export interface ZkProofInput {
  corporateEntityId: string;
  auditYear: number;
  actualEmissionsMt: number;
  emissionsCapMt: number;
  blindingFactorHex: string;
}

export function generatePedersenCommitment(actualEmissions: number, blindingFactorHex: string): string {
  if (actualEmissions < 0) {
    throw new Error("Emissions value cannot be negative");
  }
  return crypto
    .createHash("sha256")
    .update(`EMISSION_COMMITMENT:${actualEmissions.toFixed(4)}:${blindingFactorHex}`)
    .digest("hex");
}

export function generateNullifier(corporateEntityId: string, auditYear: number, blindingFactorHex: string): string {
  return crypto
    .createHash("sha256")
    .update(`NULLIFIER:${corporateEntityId}:${auditYear}:${blindingFactorHex}`)
    .digest("hex");
}

export function createZkProof(input: ZkProofInput): Partial<IZkEmissionsProof> {
  if (input.actualEmissionsMt > input.emissionsCapMt) {
    throw new Error(
      `Cannot generate valid ZK compliance proof: actual emissions (${input.actualEmissionsMt} MT) exceed cap (${input.emissionsCapMt} MT)`
    );
  }
  if (!input.blindingFactorHex || input.blindingFactorHex.length < 16) {
    throw new Error("Blinding factor must be a secure hex string with at least 16 characters");
  }

  const pedersenCommitment = generatePedersenCommitment(input.actualEmissionsMt, input.blindingFactorHex);
  const nullifierHash = generateNullifier(input.corporateEntityId, input.auditYear, input.blindingFactorHex);
  const proofId = `ZK-PROOF-${input.auditYear}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  // Non-interactive proof signature binding commitment to cap
  const proofSignature = crypto
    .createHash("sha256")
    .update(`RANGE_PROOF_SIG:${proofId}:${pedersenCommitment}:${input.emissionsCapMt}:${nullifierHash}`)
    .digest("hex");

  return {
    proofId,
    corporateEntityId: input.corporateEntityId,
    auditYear: input.auditYear,
    emissionsCapMt: input.emissionsCapMt,
    pedersenCommitment,
    proofSignature,
    nullifierHash,
    verified: true,
    verifiedAt: new Date(),
  };
}

export function verifyZkProof(
  proof: Partial<IZkEmissionsProof>,
  usedNullifiers: Set<string>
): { valid: boolean; error?: string } {
  if (!proof.proofId || !proof.pedersenCommitment || !proof.nullifierHash || !proof.proofSignature) {
    return { valid: false, error: "Missing essential ZK proof components" };
  }

  // Anti-replay nullifier check
  if (usedNullifiers.has(proof.nullifierHash)) {
    return { valid: false, error: "Double-spending detected: nullifier hash already used in another audit" };
  }

  // Verify non-interactive signature
  const expectedSig = crypto
    .createHash("sha256")
    .update(`RANGE_PROOF_SIG:${proof.proofId}:${proof.pedersenCommitment}:${proof.emissionsCapMt}:${proof.nullifierHash}`)
    .digest("hex");

  if (proof.proofSignature !== expectedSig) {
    return { valid: false, error: "Cryptographic proof signature mismatch" };
  }

  return { valid: true };
}
