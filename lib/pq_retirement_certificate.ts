import crypto from "crypto";
import { IPqRetirementCertificate } from "@/models/PqRetirementCertificate";

export interface RetirementPayload {
  certificateId: string;
  projectId: string;
  beneficiaryEntity: string;
  beneficiaryPublicKey: string;
  auditorPublicKey: string;
  tonnesRetired: number;
}

export function generateHybridCommitment(payload: RetirementPayload): string {
  if (payload.tonnesRetired <= 0) {
    throw new Error("Tonnes retired must be strictly positive");
  }
  const canonical = [
    payload.certificateId,
    payload.projectId,
    payload.beneficiaryEntity,
    payload.beneficiaryPublicKey,
    payload.auditorPublicKey,
    payload.tonnesRetired.toFixed(4),
  ].join("|");

  return crypto.createHash("sha3-512").update(canonical).digest("hex");
}

export function signClassical(payload: RetirementPayload, secretKey: string): string {
  const commitment = generateHybridCommitment(payload);
  return crypto.createHmac("sha256", secretKey).update(`CLASSICAL:${commitment}`).digest("hex");
}

export function signPostQuantum(payload: RetirementPayload, pqSecretKey: string): string {
  if (pqSecretKey.length < 32) {
    throw new Error("Post-quantum secret key must be at least 32 bytes (256 bits) for lattice security");
  }
  const commitment = generateHybridCommitment(payload);
  // Lattice-based simulation using SHAKE-256 / SHA3-512 sponge structure
  const salt = crypto.createHash("sha256").update(pqSecretKey).digest("hex");
  return crypto
    .createHash("sha3-512")
    .update(`ML_DSA_SIM:${commitment}:${salt}`)
    .digest("hex");
}

export function issueCertificate(
  payload: RetirementPayload,
  classicalKey: string,
  pqKey: string
): Partial<IPqRetirementCertificate> {
  const hybridCommitmentHash = generateHybridCommitment(payload);
  const classicalSignature = signClassical(payload, classicalKey);
  const postQuantumSignature = signPostQuantum(payload, pqKey);

  return {
    ...payload,
    classicalSignature,
    postQuantumSignature,
    hybridCommitmentHash,
    status: "VERIFIED",
    retiredAt: new Date(),
    verifiedAt: new Date(),
  };
}

export function verifyDualSignatures(
  cert: Partial<IPqRetirementCertificate>,
  classicalKey: string,
  pqKey: string
): { valid: boolean; error?: string } {
  if (
    !cert.certificateId ||
    !cert.projectId ||
    !cert.beneficiaryEntity ||
    !cert.beneficiaryPublicKey ||
    !cert.auditorPublicKey ||
    !cert.tonnesRetired ||
    !cert.classicalSignature ||
    !cert.postQuantumSignature ||
    !cert.hybridCommitmentHash
  ) {
    return { valid: false, error: "Missing required certificate cryptographic fields" };
  }

  const payload: RetirementPayload = {
    certificateId: cert.certificateId,
    projectId: cert.projectId,
    beneficiaryEntity: cert.beneficiaryEntity,
    beneficiaryPublicKey: cert.beneficiaryPublicKey,
    auditorPublicKey: cert.auditorPublicKey,
    tonnesRetired: cert.tonnesRetired,
  };

  const recomputedCommitment = generateHybridCommitment(payload);
  if (recomputedCommitment !== cert.hybridCommitmentHash) {
    return { valid: false, error: "Hybrid commitment hash mismatch: certificate content has been tampered with" };
  }

  const expectedClassical = signClassical(payload, classicalKey);
  if (cert.classicalSignature !== expectedClassical) {
    return { valid: false, error: "Classical signature verification failed" };
  }

  const expectedPq = signPostQuantum(payload, pqKey);
  if (cert.postQuantumSignature !== expectedPq) {
    return { valid: false, error: "Post-quantum lattice signature verification failed" };
  }

  return { valid: true };
}
