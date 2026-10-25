import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import {
  verifyTimestamp,
  computeBlockHash,
  recordAuditEntry,
  isNonceReplayed,
  verifyLedgerIntegrity,
  GENESIS_HASH,
} from '@/lib/audit_ledger';
import AuditLedger from '@/models/AuditLedger';

describe('Anti-Replay Nonce Ledger & Hash Chain Suite (lib/audit_ledger.ts)', () => {
  beforeAll(async () => {
    await connectDB();
    // Clean test ledger
    await AuditLedger.deleteMany({});
  });

  afterAll(async () => {
    await AuditLedger.deleteMany({});
    await disconnectDB();
  });

  describe('Timestamp Window Verification (±300s)', () => {
    it('accepts timestamps within ±300s window', () => {
      const now = Date.now();
      expect(verifyTimestamp(now).valid).toBe(true);
      expect(verifyTimestamp(now - 100 * 1000).valid).toBe(true); // 100s ago
      expect(verifyTimestamp(now + 150 * 1000).valid).toBe(true); // 150s in future
      expect(verifyTimestamp(Math.floor(now / 1000)).valid).toBe(true); // in seconds
      expect(verifyTimestamp(new Date(now)).valid).toBe(true);
    });

    it('rejects timestamps older than 300s (past drift)', () => {
      const pastTime = Date.now() - 305 * 1000; // 305 seconds ago
      const result = verifyTimestamp(pastTime);
      expect(result.valid).toBe(false);
      expect(result.driftSeconds).toBeGreaterThan(300);
      expect(result.error).toMatch(/exceeds acceptable window of ±300s/i);
    });

    it('rejects timestamps further than 300s into future (future drift)', () => {
      const futureTime = Date.now() + 400 * 1000; // 400s into future
      const result = verifyTimestamp(futureTime);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds acceptable window/i);
    });

    it('rejects invalid or malformed timestamp values', () => {
      expect(verifyTimestamp('not-a-date').valid).toBe(false);
      expect(verifyTimestamp(NaN).valid).toBe(false);
    });
  });

  describe('Cryptographic Hash Chain & Nonce Anti-Replay', () => {
    const testDeviceId = 'dev_test_chain_001';

    it('records the first entry linked to the GENESIS_HASH with sequence 1', async () => {
      const nonce1 = `nonce_entry_1_${Date.now()}`;
      const res = await recordAuditEntry({
        deviceId: testDeviceId,
        nonce: nonce1,
        timestamp: Date.now(),
        eventType: 'telemetry',
        payload: { battery: 92 },
        signature: 'mock_sig_1',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe(201);
      expect(res.entry).toBeDefined();
      expect(res.entry?.sequence).toBe(1);
      expect(res.entry?.previousHash).toBe(GENESIS_HASH);
      expect(res.entry?.hash).toHaveLength(64);
    });

    it('records a subsequent entry linked to the previous block hash', async () => {
      const firstEntry = await AuditLedger.findOne({ sequence: 1 });
      expect(firstEntry).not.toBeNull();

      const nonce2 = `nonce_entry_2_${Date.now()}`;
      const res = await recordAuditEntry({
        deviceId: testDeviceId,
        nonce: nonce2,
        timestamp: Date.now(),
        eventType: 'health_check',
        payload: { health: 88 },
        signature: 'mock_sig_2',
      });

      expect(res.success).toBe(true);
      expect(res.entry?.sequence).toBe(2);
      expect(res.entry?.previousHash).toBe(firstEntry?.hash);
    });

    it('rejects replayed nonces with 409 status', async () => {
      const existingEntry = await AuditLedger.findOne({ sequence: 1 });
      const duplicateNonce = existingEntry!.nonce;

      expect(await isNonceReplayed(duplicateNonce)).toBe(true);

      const res = await recordAuditEntry({
        deviceId: testDeviceId,
        nonce: duplicateNonce,
        timestamp: Date.now(),
        eventType: 'telemetry',
        payload: { test: 'replay' },
        signature: 'mock_sig_replay',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(409);
      expect(res.replayed).toBe(true);
      expect(res.error).toMatch(/replay detected/i);
    });

    it('rejects audit recording if timestamp is outside window when enforceWindow is true', async () => {
      const staleTimestamp = Date.now() - 400 * 1000;
      const res = await recordAuditEntry({
        deviceId: testDeviceId,
        nonce: `stale_nonce_${Date.now()}`,
        timestamp: staleTimestamp,
        eventType: 'telemetry',
        payload: { temp: 40 },
        signature: 'mock_sig',
        enforceWindow: true,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toMatch(/exceeds acceptable window/i);
    });

    it('verifies the cryptographic integrity of an untampered hash chain', async () => {
      const integrity = await verifyLedgerIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.verifiedCount).toBe(2);
    });

    it('detects tampering if a block hash is altered in the database', async () => {
      // Intentionally tamper with block 2
      const block2 = await AuditLedger.findOne({ sequence: 2 });
      expect(block2).not.toBeNull();

      const originalHash = block2!.hash;
      await AuditLedger.updateOne({ sequence: 2 }, { $set: { hash: 'f'.repeat(64) } });

      const tamperedCheck = await verifyLedgerIntegrity();
      expect(tamperedCheck.valid).toBe(false);
      expect(tamperedCheck.error).toMatch(/hash tampered/i);

      // Restore original hash
      await AuditLedger.updateOne({ sequence: 2 }, { $set: { hash: originalHash } });
      const restoredCheck = await verifyLedgerIntegrity();
      expect(restoredCheck.valid).toBe(true);
    });
  });
});
