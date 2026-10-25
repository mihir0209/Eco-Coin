import crypto from "crypto";
import EcoVault, { IEcoVault, IVaultTranche } from "@/models/EcoVault";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export const ORACLE_PUBLIC_SALT = "ECO_ORACLE_VERIFICATION_2026";

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function computeOracleAttestationHash(params: {
  vaultId: string;
  trancheNumber: number;
  oracleSecretKey: string;
  milestoneEvidence: string;
}): string {
  const payload = [
    params.vaultId,
    params.trancheNumber.toString(),
    ORACLE_PUBLIC_SALT,
    params.oracleSecretKey,
    params.milestoneEvidence,
  ].join("::");
  return sha256(payload);
}

export interface CreateVaultParams {
  vaultId: string;
  creatorId: string;
  projectName: string;
  targetFundingEcoCoins: number;
  yieldRateApy: number;
  tranches: {
    releasePercentage: number;
    milestoneDescription: string;
  }[];
}

export async function createEcoVault(params: CreateVaultParams): Promise<IEcoVault> {
  const { vaultId, creatorId, projectName, targetFundingEcoCoins, yieldRateApy, tranches } = params;

  if (!vaultId || !creatorId || !projectName) {
    throw new Error("Missing required parameters for EcoVault creation");
  }

  if (targetFundingEcoCoins <= 0 || yieldRateApy <= 0) {
    throw new Error("Target funding and yield APY must be positive numbers");
  }

  if (!tranches || tranches.length === 0) {
    throw new Error("Vault must define at least one milestone tranche");
  }

  const totalPercentage = tranches.reduce((sum, t) => sum + t.releasePercentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.001) {
    throw new Error(`Tranche percentages must sum to exactly 100%, got ${totalPercentage}%`);
  }

  const compiledTranches: IVaultTranche[] = tranches.map((t, idx) => ({
    trancheNumber: idx + 1,
    releasePercentage: t.releasePercentage,
    amountEcoCoins: Number(((t.releasePercentage / 100) * targetFundingEcoCoins).toFixed(4)),
    milestoneDescription: t.milestoneDescription,
    released: false,
  }));

  const vault = await EcoVault.create({
    vaultId,
    creatorId,
    projectName,
    targetFundingEcoCoins,
    fundedEcoCoins: 0,
    yieldRateApy,
    status: "FUNDING",
    tranches: compiledTranches,
    investors: [],
  });

  return vault;
}

export async function investInVault(params: {
  vaultId: string;
  investorId: string;
  amount: number;
}): Promise<IEcoVault> {
  const { vaultId, investorId, amount } = params;

  if (amount <= 0) {
    throw new Error("Investment amount must be greater than zero");
  }

  const vault = await EcoVault.findOne({ vaultId });
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  if (vault.status !== "FUNDING") {
    throw new Error(`Vault is not open for funding (current status: ${vault.status})`);
  }

  const remaining = vault.targetFundingEcoCoins - vault.fundedEcoCoins;
  if (amount > remaining) {
    throw new Error(`Investment amount exceeds remaining target of ${remaining} EcoCoins`);
  }

  const investor = await User.findOneAndUpdate(
    { _id: investorId, totalEcoCoins: { $gte: amount } },
    { $inc: { totalEcoCoins: -amount } },
    { new: true }
  );

  if (!investor) {
    throw new Error("Insufficient balance or concurrent deduction collision");
  }

  await Transaction.create({
    userId: investorId,
    amount,
    type: "redeem",
    description: `Green Bond Investment in ${vault.projectName} (${vaultId})`,
  });

  vault.fundedEcoCoins = Number((vault.fundedEcoCoins + amount).toFixed(4));
  vault.investors.push({
    investorId,
    amount,
    investedAt: new Date(),
  });

  if (vault.fundedEcoCoins >= vault.targetFundingEcoCoins) {
    vault.status = "ACTIVE";
  }

  await vault.save();
  return vault;
}

export async function releaseVaultTranche(params: {
  vaultId: string;
  trancheNumber: number;
  oracleSecretKey: string;
  milestoneEvidence: string;
}): Promise<IEcoVault> {
  const { vaultId, trancheNumber, oracleSecretKey, milestoneEvidence } = params;

  const vault = await EcoVault.findOne({ vaultId });
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  if (vault.status !== "ACTIVE") {
    throw new Error(`Cannot release tranche: vault is in '${vault.status}' state`);
  }

  const targetTranche = vault.tranches.find((t) => t.trancheNumber === trancheNumber);
  if (!targetTranche) {
    throw new Error(`Tranche #${trancheNumber} not found in vault`);
  }

  if (targetTranche.released) {
    throw new Error(`Tranche #${trancheNumber} has already been released`);
  }

  for (const prev of vault.tranches) {
    if (prev.trancheNumber < trancheNumber && !prev.released) {
      throw new Error(`Prerequisite Tranche #${prev.trancheNumber} has not been completed yet`);
    }
  }

  if (!oracleSecretKey || oracleSecretKey.length < 8) {
    throw new Error("Invalid or missing environmental oracle secret key");
  }

  const attestationHash = computeOracleAttestationHash({
    vaultId,
    trancheNumber,
    oracleSecretKey,
    milestoneEvidence,
  });

  const creator = await User.findByIdAndUpdate(
    vault.creatorId,
    { $inc: { totalEcoCoins: targetTranche.amountEcoCoins } },
    { new: true }
  );

  if (!creator) {
    throw new Error(`Creator ${vault.creatorId} not found`);
  }

  await Transaction.create({
    userId: vault.creatorId,
    amount: targetTranche.amountEcoCoins,
    type: "earn",
    description: `Tranche #${trancheNumber} Release for ${vault.projectName}`,
  });

  targetTranche.released = true;
  targetTranche.releasedAt = new Date();
  targetTranche.oracleAttestationHash = attestationHash;

  const allReleased = vault.tranches.every((t) => t.released);
  if (allReleased) {
    vault.status = "COMPLETED";
  }

  await vault.save();
  return vault;
}
