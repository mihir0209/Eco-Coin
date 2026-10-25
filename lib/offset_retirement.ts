import crypto from "crypto";
import mongoose from "mongoose";
import OffsetCertificate, { IOffsetCertificate } from "@/models/OffsetCertificate";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export const CO2_KG_PER_ECO_COIN = 10; // 1 Eco-Coin offsets 10 kg CO2 (0.01 metric tons)

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function calculateRequiredCoins(co2Kg: number): number {
  if (co2Kg <= 0) {
    throw new Error("CO2 offset amount must be greater than zero");
  }
  return Number((co2Kg / CO2_KG_PER_ECO_COIN).toFixed(4));
}

export function computeCertificateVerificationHash(params: {
  certificateId: string;
  userId: string;
  beneficiaryName: string;
  scope: string;
  co2KgRetired: number;
  ecoCoinsBurned: number;
  timestamp: string | Date;
}): string {
  const tsStr = params.timestamp instanceof Date ? params.timestamp.toISOString() : String(params.timestamp);
  const payload = [
    params.certificateId,
    params.userId,
    params.beneficiaryName,
    params.scope,
    params.co2KgRetired.toFixed(4),
    params.ecoCoinsBurned.toFixed(4),
    tsStr,
  ].join("::");
  return sha256(payload);
}

export function generateCertificateId(beneficiary: string): string {
  const nonce = crypto.randomBytes(6).toString("hex").toUpperCase();
  const slug = beneficiary
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase() || "BENEFICIARY";
  return `CERT-CO2-${slug}-${nonce}`;
}

export interface RetireOffsetParams {
  userId: string;
  beneficiaryName: string;
  scope?: "scope1" | "scope2" | "scope3";
  co2KgRetired: number;
  retirementReason?: string;
}

export async function retireCarbonOffset(params: RetireOffsetParams): Promise<IOffsetCertificate> {
  const { userId, beneficiaryName, scope = "scope3", co2KgRetired, retirementReason = "Voluntary Carbon Offset" } = params;

  if (!userId || !beneficiaryName) {
    throw new Error("userId and beneficiaryName are strictly required");
  }

  if (typeof co2KgRetired !== "number" || isNaN(co2KgRetired) || co2KgRetired <= 0) {
    throw new Error("co2KgRetired must be a positive number");
  }

  const requiredCoins = calculateRequiredCoins(co2KgRetired);

  // Check and atomically update user balance
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  if (user.totalEcoCoins < requiredCoins) {
    throw new Error(`Insufficient Eco-Coin balance: required ${requiredCoins}, available ${user.totalEcoCoins}`);
  }

  const certId = generateCertificateId(beneficiaryName);
  const now = new Date();
  const verificationHash = computeCertificateVerificationHash({
    certificateId: certId,
    userId,
    beneficiaryName,
    scope,
    co2KgRetired,
    ecoCoinsBurned: requiredCoins,
    timestamp: now,
  });

  // Atomic deduction
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, totalEcoCoins: { $gte: requiredCoins } },
    { $inc: { totalEcoCoins: -requiredCoins } },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error("Concurrent balance deduction conflict; please retry");
  }

  // Create audit transaction for token burn
  await Transaction.create({
    userId,
    amount: requiredCoins,
    type: "redeem",
    description: `Carbon Offset Burn for Certificate ${certId} (${co2KgRetired} kg CO2)`,
  });

  // Save certificate
  const cert = await OffsetCertificate.create({
    certificateId: certId,
    userId,
    beneficiaryName,
    scope,
    co2KgRetired,
    ecoCoinsBurned: requiredCoins,
    verificationHash,
    retirementReason,
    status: "RETIRED",
    createdAt: now,
    updatedAt: now,
  });

  return cert;
}

export async function verifyOffsetCertificate(certificateId: string): Promise<{
  valid: boolean;
  certificate?: IOffsetCertificate;
  reason?: string;
}> {
  if (!certificateId) {
    return { valid: false, reason: "Missing certificateId" };
  }

  const cert = await OffsetCertificate.findOne({ certificateId });
  if (!cert) {
    return { valid: false, reason: "Certificate not found in registry" };
  }

  if (cert.status !== "RETIRED") {
    return { valid: false, certificate: cert, reason: `Certificate is in ${cert.status} state` };
  }

  const expectedHash = computeCertificateVerificationHash({
    certificateId: cert.certificateId,
    userId: cert.userId,
    beneficiaryName: cert.beneficiaryName,
    scope: cert.scope,
    co2KgRetired: cert.co2KgRetired,
    ecoCoinsBurned: cert.ecoCoinsBurned,
    timestamp: cert.createdAt,
  });

  if (cert.verificationHash !== expectedHash) {
    return { valid: false, certificate: cert, reason: "Cryptographic verification hash mismatch; attestation compromised" };
  }

  return { valid: true, certificate: cert };
}
