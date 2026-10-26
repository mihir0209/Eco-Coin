import crypto from "crypto";
import { RetirementCertificate, IRetirementCertificate } from "@/models/RetirementCertificate";

export function computeCertificateHash(
  certificateId: string,
  owner: string,
  beneficiary: string,
  tons: number,
  standard: string,
  timestamp: number
): string {
  const payload = `${certificateId}:${owner}:${beneficiary}:${tons}:${standard}:${timestamp}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function mintRetirementCertificate(
  certificateId: string,
  owner: string,
  beneficiary: string,
  tonsRetired: number,
  creditStandard: "VERRA" | "GOLD_STANDARD" | "CER",
  retirementReason: string
): Promise<IRetirementCertificate> {
  if (tonsRetired <= 0) {
    throw new Error("Tons to retire must be strictly positive");
  }

  const existing = await RetirementCertificate.findOne({ certificateId });
  if (existing) {
    throw new Error(`Retirement certificate ${certificateId} already exists`);
  }

  const timestamp = Date.now();
  const certificateHash = computeCertificateHash(
    certificateId,
    owner,
    beneficiary,
    tonsRetired,
    creditStandard,
    timestamp
  );

  const metadataJson = {
    name: `Eco-Coin Carbon Offset Certificate #${certificateId}`,
    description: `Permanent offset retirement of ${tonsRetired} tCO2e under ${creditStandard}`,
    image: `ipfs://bafybeicertificates/${certificateHash}.png`,
    attributes: [
      { trait_type: "Standard", value: creditStandard },
      { trait_type: "Tons Retired", value: tonsRetired },
      { trait_type: "Beneficiary", value: beneficiary },
      { trait_type: "Reason", value: retirementReason },
      { trait_type: "SHA256 Hash", value: certificateHash },
    ],
  };

  const metadataUri = `ipfs://bafybeimeta/${certificateId}.json`;

  const cert = new RetirementCertificate({
    certificateId,
    owner,
    beneficiary,
    tonsRetired,
    creditStandard,
    retirementReason,
    certificateHash,
    metadataUri,
    status: "minted",
    retiredAt: new Date(timestamp),
  });

  return await cert.save();
}

export async function verifyRetirementCertificate(
  certificateId: string,
  expectedHash?: string
): Promise<{ valid: boolean; certificate: IRetirementCertificate | null; error?: string }> {
  const cert = await RetirementCertificate.findOne({ certificateId });
  if (!cert) {
    return { valid: false, certificate: null, error: "Certificate not found" };
  }

  if (cert.status !== "minted") {
    return { valid: false, certificate: cert, error: `Certificate is ${cert.status}` };
  }

  const recalculated = computeCertificateHash(
    cert.certificateId,
    cert.owner,
    cert.beneficiary,
    cert.tonsRetired,
    cert.creditStandard,
    new Date(cert.retiredAt).getTime()
  );

  if (recalculated !== cert.certificateHash) {
    return { valid: false, certificate: cert, error: "Cryptographic tamper detected" };
  }

  if (expectedHash && expectedHash !== cert.certificateHash) {
    return { valid: false, certificate: cert, error: "Hash mismatch with external ledger query" };
  }

  return { valid: true, certificate: cert };
}

export async function revokeRetirementCertificate(
  certificateId: string,
  reason: string
): Promise<IRetirementCertificate> {
  const cert = await RetirementCertificate.findOne({ certificateId });
  if (!cert) {
    throw new Error(`Certificate ${certificateId} not found`);
  }

  cert.status = "revoked";
  cert.retirementReason = `REVOKED: ${reason} (Original: ${cert.retirementReason})`;
  return await cert.save();
}

// Aliases for backward compatibility with existing route imports
export const retireCarbonOffset = mintRetirementCertificate;
export const verifyOffsetCertificate = verifyRetirementCertificate;
