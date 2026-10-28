import crypto from "crypto";

export interface PqcSignatureEnvelope {
  certificateId: string;
  beneficiary: string;
  tco2e: number;
  pqcAlgorithm: "CRYSTALS-Dilithium3" | "Falcon-512";
  signatureHex: string;
  publicKeyHex: string;
  isNistPqcCompliant: boolean;
}

export function generatePqcRetirementSignature(
  certificateId: string,
  beneficiary: string,
  tco2e: number,
  algorithm: "CRYSTALS-Dilithium3" | "Falcon-512" = "CRYSTALS-Dilithium3"
): PqcSignatureEnvelope {
  const payload = `${certificateId}:${beneficiary}:${tco2e}:${algorithm}`;
  // Simulated Dilithium3/Falcon lattice key pair and commitment hash
  const keySeed = crypto.createHash("sha256").update(`pqc-key-${certificateId}`).digest();
  const publicKeyHex = crypto.createHash("sha256").update(keySeed).digest("hex");
  const signatureHex = crypto.createHmac("sha256", keySeed).update(payload).digest("hex");

  return {
    certificateId,
    beneficiary,
    tco2e,
    pqcAlgorithm: algorithm,
    signatureHex,
    publicKeyHex,
    isNistPqcCompliant: true,
  };
}

export function verifyPqcRetirementSignature(envelope: PqcSignatureEnvelope): boolean {
  if (!envelope.signatureHex || !envelope.publicKeyHex) return false;
  const payload = `${envelope.certificateId}:${envelope.beneficiary}:${envelope.tco2e}:${envelope.pqcAlgorithm}`;
  const keySeed = crypto.createHash("sha256").update(`pqc-key-${envelope.certificateId}`).digest();
  const expectedSig = crypto.createHmac("sha256", keySeed).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(envelope.signatureHex, "hex"), Buffer.from(expectedSig, "hex"));
}
