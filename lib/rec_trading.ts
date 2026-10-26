import crypto from "crypto";
import RenewableCertificate, { IRenewableCertificate, EnergySourceType } from "@/models/RenewableCertificate";

export interface RecMintParams {
  generatorId: string;
  gridRegion: string;
  energySource: EnergySourceType;
  megawattHours: number;
  meterReadings: number[];
  vintageYear: number;
  ownerId: string;
  generatorPrivateKey?: string;
}

export interface P2PTradeOrder {
  orderId: string;
  recId: string;
  sellerId: string;
  pricePerMwh: number;
  totalPrice: number;
  active: boolean;
}

export function computeMeterMerkleRoot(readings: number[]): string {
  if (!readings || readings.length === 0) {
    throw new Error("At least one meter reading required to generate Merkle root");
  }
  let hashes = readings.map((r, idx) =>
    crypto.createHash("sha256").update(`meter_${idx}:${r.toFixed(3)}`).digest("hex")
  );

  while (hashes.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        const combined = crypto
          .createHash("sha256")
          .update(hashes[i] + hashes[i + 1])
          .digest("hex");
        nextLevel.push(combined);
      } else {
        nextLevel.push(hashes[i]);
      }
    }
    hashes = nextLevel;
  }
  return hashes[0];
}

export function signGeneratorTelemetry(
  generatorId: string,
  root: string,
  mwh: number,
  secretKey: string = "grid_node_attestation_key"
): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(`${generatorId}:${root}:${mwh.toFixed(3)}`)
    .digest("hex");
}

export function buildRecRecord(params: RecMintParams): Partial<IRenewableCertificate> {
  if (params.megawattHours <= 0) {
    throw new Error("megawattHours must be strictly positive");
  }
  if (!params.gridRegion || params.gridRegion.trim().length === 0) {
    throw new Error("gridRegion is required");
  }
  const meterMerkleRoot = computeMeterMerkleRoot(params.meterReadings);
  const generatorSignature = signGeneratorTelemetry(
    params.generatorId,
    meterMerkleRoot,
    params.megawattHours
  );
  const recId = `REC-${params.vintageYear}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  return {
    recId,
    generatorId: params.generatorId,
    gridRegion: params.gridRegion.toUpperCase(),
    energySource: params.energySource,
    megawattHours: params.megawattHours,
    meterMerkleRoot,
    vintageYear: params.vintageYear,
    ownerId: params.ownerId,
    status: "ACTIVE",
    generatorSignature,
    mintedAt: new Date(),
  };
}

export function executeRecSettlement(
  rec: Partial<IRenewableCertificate>,
  buyerId: string,
  buyerBalance: number,
  pricePerMwh: number
): {
  success: boolean;
  totalCost: number;
  protocolFee: number;
  netSellerProceeds: number;
  newOwner: string;
} {
  if (rec.status !== "ACTIVE" && rec.status !== "LISTED") {
    throw new Error(`Cannot purchase certificate with status: ${rec.status}`);
  }
  if (rec.ownerId === buyerId) {
    throw new Error("Wash trading prohibited: buyer and seller are identical");
  }

  const mwh = rec.megawattHours || 0;
  const grossAmount = mwh * pricePerMwh;
  const protocolFee = grossAmount * 0.005; // 0.5% fee
  const totalCost = grossAmount + protocolFee;

  if (buyerBalance < totalCost) {
    throw new Error(
      `Insufficient buyer balance: required ${totalCost.toFixed(2)}, available ${buyerBalance.toFixed(2)}`
    );
  }

  rec.ownerId = buyerId;
  rec.status = "ACTIVE";

  return {
    success: true,
    totalCost,
    protocolFee,
    netSellerProceeds: grossAmount,
    newOwner: buyerId,
  };
}

export function retireRecForCompliance(
  rec: Partial<IRenewableCertificate>,
  requesterId: string,
  beneficiary: string
): {
  retirementHash: string;
  retiredAt: Date;
} {
  if (rec.ownerId !== requesterId) {
    throw new Error("Only current certificate owner can retire this REC");
  }
  if (rec.status === "RETIRED") {
    throw new Error("Certificate is already retired (double-claiming prevention)");
  }
  if (rec.status === "SLASHED") {
    throw new Error("Cannot retire slashed certificate");
  }

  const retiredAt = new Date();
  const retirementHash = crypto
    .createHash("sha256")
    .update(`${rec.recId}:${requesterId}:${beneficiary}:${retiredAt.toISOString()}`)
    .digest("hex");

  rec.status = "RETIRED";
  rec.retiredAt = retiredAt;
  rec.retirementBeneficiary = beneficiary;

  return {
    retirementHash,
    retiredAt,
  };
}
