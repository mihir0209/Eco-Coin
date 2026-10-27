import crypto from "crypto";
import HtlcEscrow, { IHtlcEscrow } from "../models/HtlcEscrow";

export interface InitiateEscrowParams {
  escrowId: string;
  sender: string;
  recipient: string;
  amount: number;
  hashLock: string;
  timeLock: Date;
  chain?: string;
  counterpartyChain?: string;
}

export interface HtlcEscrowRecord {
  escrowId: string;
  sender: string;
  recipient: string;
  amount: number;
  hashLock: string;
  timeLock: Date;
  state: "ACTIVE" | "CLAIMED" | "REFUNDED";
  preimage?: string;
  claimedAt?: Date;
  refundedAt?: Date;
  chain: string;
  counterpartyChain: string;
}

/**
 * Generate a cryptographically secure SHA-256 hash lock from a secret preimage.
 */
export function createHashLock(preimage: string): string {
  if (!preimage || typeof preimage !== "string") {
    throw new Error("Preimage must be a non-empty string");
  }
  return crypto.createHash("sha256").update(preimage, "utf8").digest("hex");
}

/**
 * Verify a secret preimage against a given hash lock using constant-time comparison.
 */
export function verifyPreimage(preimage: string, hashLock: string): boolean {
  if (!preimage || !hashLock) return false;
  const computed = crypto.createHash("sha256").update(preimage, "utf8").digest("hex");
  if (computed.length !== hashLock.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hashLock, "hex"));
}

/**
 * Pure state transition: Build a validated in-memory HTLC Escrow Record.
 */
export function buildHtlcEscrow(
  params: InitiateEscrowParams,
  currentTime: Date = new Date()
): HtlcEscrowRecord {
  const { escrowId, sender, recipient, amount, hashLock, timeLock, chain, counterpartyChain } = params;

  if (!escrowId || !sender || !recipient) {
    throw new Error("Missing required escrow participants or ID");
  }

  if (typeof amount !== "number" || amount <= 0 || !Number.isFinite(amount)) {
    throw new Error("Escrow carbon amount must be a positive finite number");
  }

  if (!/^[a-f0-9]{64}$/i.test(hashLock)) {
    throw new Error("Hashlock must be a 64-character hexadecimal SHA-256 string");
  }

  if (!(timeLock instanceof Date) || isNaN(timeLock.getTime()) || timeLock.getTime() <= currentTime.getTime()) {
    throw new Error("Timelock must be a valid future Date");
  }

  return {
    escrowId,
    sender,
    recipient,
    amount,
    hashLock: hashLock.toLowerCase(),
    timeLock,
    state: "ACTIVE",
    chain: chain || "ECOCOIN-MAINNET",
    counterpartyChain: counterpartyChain || "ETH-CARBON",
  };
}

/**
 * Pure state transition: Claim an active HTLC escrow by revealing preimage.
 */
export function claimHtlcRecord(
  escrow: HtlcEscrowRecord,
  preimage: string,
  caller: string,
  currentTime: Date = new Date()
): HtlcEscrowRecord {
  if (escrow.state !== "ACTIVE") {
    throw new Error(`Escrow is already ${escrow.state}, cannot claim`);
  }

  if (escrow.recipient.toLowerCase() !== caller.toLowerCase()) {
    throw new Error(`Unauthorized caller ${caller}: only designated recipient ${escrow.recipient} can claim`);
  }

  if (currentTime.getTime() >= escrow.timeLock.getTime()) {
    throw new Error("Timelock expired: escrow can no longer be claimed, eligible for refund only");
  }

  if (!verifyPreimage(preimage, escrow.hashLock)) {
    throw new Error("Cryptographic verification failed: invalid secret preimage for hash lock");
  }

  return {
    ...escrow,
    state: "CLAIMED",
    preimage,
    claimedAt: currentTime,
  };
}

/**
 * Pure state transition: Refund an active HTLC escrow after timelock expiration.
 */
export function refundHtlcRecord(
  escrow: HtlcEscrowRecord,
  caller: string,
  currentTime: Date = new Date()
): HtlcEscrowRecord {
  if (escrow.state !== "ACTIVE") {
    throw new Error(`Escrow is already ${escrow.state}, cannot refund`);
  }

  if (escrow.sender.toLowerCase() !== caller.toLowerCase()) {
    throw new Error(`Unauthorized caller ${caller}: only original sender ${escrow.sender} can request refund`);
  }

  if (currentTime.getTime() < escrow.timeLock.getTime()) {
    const remainingSec = Math.ceil((escrow.timeLock.getTime() - currentTime.getTime()) / 1000);
    throw new Error(`Timelock active: cannot refund prior to expiration (${remainingSec}s remaining)`);
  }

  return {
    ...escrow,
    state: "REFUNDED",
    refundedAt: currentTime,
  };
}

/**
 * On-chain persistence: Initiate an on-chain Hashed Time-Lock Contract (HTLC) carbon escrow.
 */
export async function initiateHtlcEscrow(params: InitiateEscrowParams): Promise<IHtlcEscrow> {
  const record = buildHtlcEscrow(params);

  const existing = await HtlcEscrow.findOne({ escrowId: record.escrowId });
  if (existing) {
    throw new Error(`Escrow with ID ${record.escrowId} already exists`);
  }

  return await HtlcEscrow.create(record);
}

/**
 * On-chain persistence: Claim an active HTLC escrow by revealing secret preimage.
 */
export async function claimHtlcEscrow(
  escrowId: string,
  preimage: string,
  caller: string
): Promise<IHtlcEscrow> {
  const escrow = await HtlcEscrow.findOne({ escrowId });
  if (!escrow) {
    throw new Error(`Escrow ${escrowId} not found`);
  }

  const updatedRecord = claimHtlcRecord(
    {
      escrowId: escrow.escrowId,
      sender: escrow.sender,
      recipient: escrow.recipient,
      amount: escrow.amount,
      hashLock: escrow.hashLock,
      timeLock: escrow.timeLock,
      state: escrow.state,
      chain: escrow.chain,
      counterpartyChain: escrow.counterpartyChain,
    },
    preimage,
    caller
  );

  escrow.state = updatedRecord.state;
  escrow.preimage = updatedRecord.preimage;
  escrow.claimedAt = updatedRecord.claimedAt;
  await escrow.save();

  return escrow;
}

/**
 * On-chain persistence: Refund an active HTLC escrow back to the sender after timelock expiration.
 */
export async function refundHtlcEscrow(
  escrowId: string,
  caller: string
): Promise<IHtlcEscrow> {
  const escrow = await HtlcEscrow.findOne({ escrowId });
  if (!escrow) {
    throw new Error(`Escrow ${escrowId} not found`);
  }

  const updatedRecord = refundHtlcRecord(
    {
      escrowId: escrow.escrowId,
      sender: escrow.sender,
      recipient: escrow.recipient,
      amount: escrow.amount,
      hashLock: escrow.hashLock,
      timeLock: escrow.timeLock,
      state: escrow.state,
      chain: escrow.chain,
      counterpartyChain: escrow.counterpartyChain,
    },
    caller
  );

  escrow.state = updatedRecord.state;
  escrow.refundedAt = updatedRecord.refundedAt;
  await escrow.save();

  return escrow;
}
