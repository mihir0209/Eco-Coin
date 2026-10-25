import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import AuditLedger, { IAuditLedger } from '@/models/AuditLedger';
import { canonicalizePayload } from './device_auth';

export const GENESIS_HASH = '0'.repeat(64);
export const DEFAULT_WINDOW_SECONDS = 300; // ±300s anti-replay window

/**
 * Validates whether a given timestamp is within the acceptable ±300s window.
 */
export function verifyTimestamp(
  timestamp: string | number | Date,
  windowSeconds = DEFAULT_WINDOW_SECONDS
): {
  valid: boolean;
  driftSeconds: number;
  error?: string;
} {
  let tsMs: number;

  if (timestamp instanceof Date) {
    tsMs = timestamp.getTime();
  } else if (typeof timestamp === 'number') {
    // If Unix timestamp in seconds (< 1e11), convert to milliseconds
    tsMs = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  } else if (typeof timestamp === 'string') {
    const num = Number(timestamp);
    if (!isNaN(num)) {
      tsMs = num < 1e11 ? num * 1000 : num;
    } else {
      tsMs = new Date(timestamp).getTime();
    }
  } else {
    return {
      valid: false,
      driftSeconds: Infinity,
      error: 'Invalid timestamp format',
    };
  }

  if (isNaN(tsMs)) {
    return {
      valid: false,
      driftSeconds: Infinity,
      error: 'Invalid timestamp value',
    };
  }

  const nowMs = Date.now();
  const driftSeconds = Math.abs(nowMs - tsMs) / 1000;

  if (driftSeconds > windowSeconds) {
    return {
      valid: false,
      driftSeconds,
      error: `Timestamp drift (${Math.round(driftSeconds)}s) exceeds acceptable window of ±${windowSeconds}s`,
    };
  }

  return {
    valid: true,
    driftSeconds,
  };
}

/**
 * Computes the cryptographic block hash in the audit chain.
 * Formula: SHA256(sequence|previousHash|deviceId|nonce|timestamp|eventType|canonicalPayload|signature)
 */
export function computeBlockHash({
  sequence,
  previousHash,
  deviceId,
  nonce,
  timestamp,
  eventType,
  payload,
  signature,
}: {
  sequence: number;
  previousHash: string;
  deviceId: string;
  nonce: string;
  timestamp: string | number | Date;
  eventType: string;
  payload: any;
  signature: string;
}): string {
  const tsStr =
    timestamp instanceof Date
      ? timestamp.toISOString()
      : typeof timestamp === 'number'
      ? new Date(timestamp < 1e11 ? timestamp * 1000 : timestamp).toISOString()
      : String(timestamp);

  const payloadStr = canonicalizePayload(payload);
  const data = [
    sequence,
    previousHash,
    deviceId,
    nonce,
    tsStr,
    eventType,
    payloadStr,
    signature,
  ].join('|');

  return crypto.createHash('sha256').update(data).digest('hex');
}

let indexesSynced = false;
async function ensureAuditIndexes() {
  if (!indexesSynced) {
    try {
      await AuditLedger.syncIndexes();
      indexesSynced = true;
    } catch {
      await AuditLedger.init();
    }
  }
}

/**
 * Checks if a nonce has already been registered in the audit ledger (Anti-Replay).
 */
export async function isNonceReplayed(nonce: string): Promise<boolean> {
  if (!nonce) return true;
  await connectDB();
  await ensureAuditIndexes();
  const existing = await AuditLedger.findOne({ nonce });
  return !!existing;
}

export interface RecordEntryParams {
  deviceId: string;
  nonce: string;
  timestamp: string | number | Date;
  eventType: string;
  payload: any;
  signature: string;
  enforceWindow?: boolean;
  windowSeconds?: number;
}

/**
 * Persists a validated transaction entry into MongoDB with an immutable cryptographic hash chain.
 * Rejects replayed nonces or requests outside the timestamp window.
 */
export async function recordAuditEntry(
  params: RecordEntryParams
): Promise<{
  success: boolean;
  entry?: IAuditLedger;
  error?: string;
  status: number;
  replayed?: boolean;
}> {
  await connectDB();
  await ensureAuditIndexes();

  const {
    deviceId,
    nonce,
    timestamp,
    eventType,
    payload,
    signature,
    enforceWindow = true,
    windowSeconds = DEFAULT_WINDOW_SECONDS,
  } = params;

  if (!deviceId || !nonce || timestamp === undefined || !eventType || !signature) {
    return {
      success: false,
      status: 400,
      error: 'Missing required audit parameters (deviceId, nonce, timestamp, eventType, signature)',
    };
  }

  // 1. Anti-Replay: Timestamp window check (±300s)
  if (enforceWindow) {
    const timeCheck = verifyTimestamp(timestamp, windowSeconds);
    if (!timeCheck.valid) {
      return {
        success: false,
        status: 400,
        error: timeCheck.error,
      };
    }
  }

  // 2. Anti-Replay: Nonce check
  const replayed = await isNonceReplayed(nonce);
  if (replayed) {
    return {
      success: false,
      status: 409,
      replayed: true,
      error: `Replay detected: Nonce '${nonce}' has already been processed in the audit ledger`,
    };
  }

  // 3. Cryptographic Hash Chain: Retrieve previous block
  const lastEntry = await AuditLedger.findOne().sort({ sequence: -1 });

  const sequence = lastEntry ? lastEntry.sequence + 1 : 1;
  const previousHash = lastEntry ? lastEntry.hash : GENESIS_HASH;

  const dateObj =
    timestamp instanceof Date
      ? timestamp
      : typeof timestamp === 'number'
      ? new Date(timestamp < 1e11 ? timestamp * 1000 : timestamp)
      : new Date(timestamp);

  const hash = computeBlockHash({
    sequence,
    previousHash,
    deviceId,
    nonce,
    timestamp: dateObj,
    eventType,
    payload,
    signature,
  });

  try {
    const newEntry = await AuditLedger.create({
      sequence,
      deviceId,
      nonce,
      timestamp: dateObj,
      eventType,
      payload,
      signature,
      previousHash,
      hash,
    });

    return {
      success: true,
      status: 201,
      entry: newEntry,
    };
  } catch (err: any) {
    // If a duplicate key race condition occurred on nonce or sequence
    if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
      return {
        success: false,
        status: 409,
        replayed: true,
        error: `Replay detected or conflict on nonce/sequence: ${err.message}`,
      };
    }
    return {
      success: false,
      status: 500,
      error: `Failed to record audit entry: ${err.message}`,
    };
  }
}

/**
 * Validates the cryptographic integrity of the entire audit chain in MongoDB.
 * Verifies every hash and previousHash pointer from genesis to the latest block.
 */
export async function verifyLedgerIntegrity(): Promise<{
  valid: boolean;
  verifiedCount: number;
  error?: string;
  brokenSequence?: number;
}> {
  await connectDB();

  const entries: IAuditLedger[] = await AuditLedger.find().sort({ sequence: 1 });

  if (entries.length === 0) {
    return { valid: true, verifiedCount: 0 };
  }

  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedSequence = i + 1;

    if (entry.sequence !== expectedSequence) {
      return {
        valid: false,
        verifiedCount: i,
        brokenSequence: entry.sequence,
        error: `Sequence mismatch at index ${i}: expected ${expectedSequence}, found ${entry.sequence}`,
      };
    }

    if (entry.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        verifiedCount: i,
        brokenSequence: entry.sequence,
        error: `Hash pointer broken at block ${entry.sequence}: previousHash does not match prior block hash`,
      };
    }

    const calculatedHash = computeBlockHash({
      sequence: entry.sequence,
      previousHash: entry.previousHash,
      deviceId: entry.deviceId,
      nonce: entry.nonce,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      payload: entry.payload,
      signature: entry.signature,
    });

    if (entry.hash !== calculatedHash) {
      return {
        valid: false,
        verifiedCount: i,
        brokenSequence: entry.sequence,
        error: `Hash tampered at block ${entry.sequence}: stored hash ${entry.hash} != calculated ${calculatedHash}`,
      };
    }

    expectedPreviousHash = entry.hash;
  }

  return {
    valid: true,
    verifiedCount: entries.length,
  };
}
