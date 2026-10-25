import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { POST } from '@/app/api/sync/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import Device from '@/models/Device';
import AuditLedger from '@/models/AuditLedger';
import Transaction from '@/models/Transaction';
import {
  generateDeviceSecret,
  signPayload,
} from '@/lib/device_auth';
import {
  recordAuditEntry,
  isNonceReplayed,
  verifyTimestamp,
  verifyLedgerIntegrity,
  GENESIS_HASH,
} from '@/lib/audit_ledger';

describe('Anti-Replay Attack Prevention & Offline Batch Sync Suite', () => {
  let testUser: any;
  let testDevice: any;
  let deviceSecret: string;

  beforeAll(async () => {
    await connectDB();
    await AuditLedger.init();

    testUser = await User.create({
      name: 'Replay Test User',
      email: `replay_${Date.now()}@example.com`,
      password: 'password123',
      totalEcoCoins: 500,
      devicesOwned: 1,
      devicesRecycled: 0,
      co2Saved: 0,
    });

    deviceSecret = generateDeviceSecret();

    testDevice = await Device.create({
      userId: testUser._id,
      name: 'Smart Eco Bin IoT',
      type: 'other',
      health: 90,
      eolPrediction: '36 months',
      ecoCoins: 300,
      status: 'good',
      performanceScore: 95,
      secretKey: deviceSecret,
    });
  });

  afterAll(async () => {
    if (testDevice) {
      await AuditLedger.deleteMany({ deviceId: testDevice._id.toString() });
      await Transaction.deleteMany({ deviceId: testDevice._id });
      await Device.findByIdAndDelete(testDevice._id);
    }
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    await AuditLedger.deleteMany({ deviceId: testDevice._id.toString() });
  });

  describe('1. Anti-Replay Attack Tests', () => {
    it('rejects the 2nd request with 409 Conflict (Replay detected) when the same valid signed request is sent twice', async () => {
      const payload = {
        type: 'telemetry',
        health: 88,
        batteryHealth: 85,
        performanceScore: 92,
      };
      const timestamp = Date.now();
      const nonce = `replay_test_nonce_${Date.now()}`;
      const signature = signPayload(payload, timestamp, nonce, deviceSecret);

      const requestPayload = {
        deviceId: testDevice._id.toString(),
        timestamp,
        nonce,
        signature,
        payload,
      };

      // --- FIRST REQUEST (Legitimate) ---
      const req1 = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.processedCount).toBe(1);
      expect(json1.duplicateCount).toBe(0);

      // Verify device was updated and audit entry recorded
      const entry1 = await AuditLedger.findOne({ nonce });
      expect(entry1).not.toBeNull();
      expect(entry1?.sequence).toBe(1);

      // --- SECOND REQUEST (Replay Attack) ---
      const req2 = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const res2 = await POST(req2);
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.error).toMatch(/replay detected/i);

      // Verify no duplicate audit entries created
      const auditCount = await AuditLedger.countDocuments({ nonce });
      expect(auditCount).toBe(1);
    });

    it('rejects a valid signed request with a stale timestamp (>300s) with 400 Bad Request', async () => {
      const payload = { type: 'telemetry', health: 80 };
      // Timestamp from 350 seconds ago (exceeds ±300s window)
      const staleTimestamp = Date.now() - 350 * 1000;
      const nonce = `stale_nonce_${Date.now()}`;
      const signature = signPayload(payload, staleTimestamp, nonce, deviceSecret);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp: staleTimestamp,
          nonce,
          signature,
          payload,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/exceeds acceptable window|timestamp drift/i);

      // Verify no audit entry was committed
      const auditEntry = await AuditLedger.findOne({ nonce });
      expect(auditEntry).toBeNull();
    });

    it('rejects a valid signed request with a future timestamp (>300s) with 400 Bad Request', async () => {
      const payload = { type: 'telemetry', health: 75 };
      // Timestamp 400 seconds in the future
      const futureTimestamp = Date.now() + 400 * 1000;
      const nonce = `future_nonce_${Date.now()}`;
      const signature = signPayload(payload, futureTimestamp, nonce, deviceSecret);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp: futureTimestamp,
          nonce,
          signature,
          payload,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/exceeds acceptable window|timestamp drift/i);
    });

    it('accepts a valid signed request within the acceptable timestamp window (e.g., 120s drift)', async () => {
      const payload = { type: 'telemetry', health: 82 };
      // 120 seconds ago (well within ±300s)
      const validTimestamp = Date.now() - 120 * 1000;
      const nonce = `within_window_nonce_${Date.now()}`;
      const signature = signPayload(payload, validTimestamp, nonce, deviceSecret);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp: validTimestamp,
          nonce,
          signature,
          payload,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.processedCount).toBe(1);
    });

    it('handles concurrent identical replay requests atomically (only one succeeds, rest rejected with 409)', async () => {
      const payload = { type: 'telemetry', health: 77 };
      const timestamp = Date.now();
      const nonce = `concurrent_nonce_${Date.now()}`;
      const signature = signPayload(payload, timestamp, nonce, deviceSecret);

      const requestBody = JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp,
        nonce,
        signature,
        payload,
      });

      // Send 5 concurrent identical requests simultaneously
      const requests = Array.from({ length: 5 }, () =>
        POST(
          new NextRequest('http://localhost:3000/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          })
        )
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // Exactly 1 request succeeds with 200, all other 4 are rejected with 409 Conflict
      const successCount = statuses.filter((s) => s === 200).length;
      const replayCount = statuses.filter((s) => s === 409).length;

      expect(successCount).toBe(1);
      expect(replayCount).toBe(4);

      // Database has exactly one audit entry
      const committedCount = await AuditLedger.countDocuments({ nonce });
      expect(committedCount).toBe(1);
    });

    it('unit test: recordAuditEntry rejects replayed nonces and stale timestamps', async () => {
      const testNonce = `ledger_unit_${Date.now()}`;
      const testTimestamp = Date.now();

      // 1. First record succeeds
      const first = await recordAuditEntry({
        deviceId: testDevice._id.toString(),
        nonce: testNonce,
        timestamp: testTimestamp,
        eventType: 'unit_test',
        payload: { test: 1 },
        signature: 'unit_sig_1',
      });
      expect(first.success).toBe(true);
      expect(first.status).toBe(201);
      expect(first.entry?.nonce).toBe(testNonce);

      // 2. Second record with same nonce is rejected with 409
      const second = await recordAuditEntry({
        deviceId: testDevice._id.toString(),
        nonce: testNonce,
        timestamp: testTimestamp,
        eventType: 'unit_test',
        payload: { test: 2 },
        signature: 'unit_sig_2',
      });
      expect(second.success).toBe(false);
      expect(second.status).toBe(409);
      expect(second.replayed).toBe(true);
      expect(second.error).toMatch(/replay detected/i);

      // 3. Stale timestamp (>300s) rejected with 400
      const staleRes = await recordAuditEntry({
        deviceId: testDevice._id.toString(),
        nonce: `stale_unit_${Date.now()}`,
        timestamp: Date.now() - 400 * 1000,
        eventType: 'unit_test',
        payload: { test: 3 },
        signature: 'unit_sig_3',
        enforceWindow: true,
      });
      expect(staleRes.success).toBe(false);
      expect(staleRes.status).toBe(400);
      expect(staleRes.error).toMatch(/exceeds acceptable window/i);
    });

    it('unit test: verifyTimestamp correctly evaluates boundary conditions', () => {
      const now = Date.now();

      // Exactly now (0s drift) -> valid
      expect(verifyTimestamp(now, 300).valid).toBe(true);

      // 299s drift -> valid
      expect(verifyTimestamp(now - 299 * 1000, 300).valid).toBe(true);

      // 301s drift -> invalid
      const stale = verifyTimestamp(now - 301 * 1000, 300);
      expect(stale.valid).toBe(false);
      expect(stale.error).toMatch(/exceeds acceptable window/i);

      // -301s future drift -> invalid
      const future = verifyTimestamp(now + 301 * 1000, 300);
      expect(future.valid).toBe(false);
      expect(future.error).toMatch(/exceeds acceptable window/i);

      // Invalid timestamp values
      expect(verifyTimestamp('invalid_date', 300).valid).toBe(false);
      expect(verifyTimestamp(NaN, 300).valid).toBe(false);
    });
  });

  describe('2. Offline Batch Sync', () => {
    it('submits a batch of 20 signed events including duplicate nonces; asserts only unique valid events are committed', async () => {
      // Construct a batch of 20 signed events:
      // - 15 unique events (nonces: offline_nonce_01 to offline_nonce_15)
      // - 5 duplicate events (reusing offline_nonce_01 to offline_nonce_05)
      const uniqueCount = 15;
      const totalEvents = 20;
      const batchTimestamp = Date.now();
      const events: any[] = [];

      for (let i = 1; i <= totalEvents; i++) {
        // Events 1..15 get unique nonces; Events 16..20 duplicate nonces 1..5
        const nonceIndex = i <= uniqueCount ? i : i - uniqueCount;
        const nonce = `offline_batch_nonce_${nonceIndex.toString().padStart(2, '0')}`;
        const payload = {
          health: 70 + (i % 25),
          batteryHealth: 80 + (i % 15),
          readingIndex: i,
        };

        const signature = signPayload(
          payload,
          batchTimestamp,
          nonce,
          deviceSecret
        );

        events.push({
          eventId: `evt_${i}`,
          nonce,
          type: 'telemetry',
          payload,
          timestamp: batchTimestamp,
          signature,
        });
      }

      expect(events).toHaveLength(20);

      // Unique nonces set should be 15
      const uniqueNonces = new Set(events.map((e) => e.nonce));
      expect(uniqueNonces.size).toBe(15);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp: batchTimestamp,
          events,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.processedCount).toBe(15);
      expect(json.duplicateCount).toBe(5);
      expect(json.results).toHaveLength(20);

      // Exactly 15 events marked 'processed'
      const processedResults = json.results.filter((r: any) => r.status === 'processed');
      expect(processedResults).toHaveLength(15);

      // Exactly 5 events marked 'already_processed' with replayed: true
      const duplicateResults = json.results.filter(
        (r: any) => r.status === 'already_processed' && r.replayed === true
      );
      expect(duplicateResults).toHaveLength(5);

      // Assert only the 15 unique events are committed to MongoDB AuditLedger
      const committedAuditEntries = await AuditLedger.find({
        deviceId: testDevice._id.toString(),
      }).sort({ sequence: 1 });

      expect(committedAuditEntries).toHaveLength(15);

      // Assert each unique nonce is present exactly once in the committed ledger
      const committedNonces = committedAuditEntries.map((e) => e.nonce);
      expect(new Set(committedNonces).size).toBe(15);
      for (let i = 1; i <= uniqueCount; i++) {
        const expectedNonce = `offline_batch_nonce_${i.toString().padStart(2, '0')}`;
        expect(committedNonces).toContain(expectedNonce);
      }

      // Assert cryptographic hash chain integrity of the committed batch
      const integrity = await verifyLedgerIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.verifiedCount).toBe(15);

      // Verify sequence starts at 1 and increments continuously to 15
      committedAuditEntries.forEach((entry, idx) => {
        expect(entry.sequence).toBe(idx + 1);
        if (idx === 0) {
          expect(entry.previousHash).toBe(GENESIS_HASH);
        } else {
          expect(entry.previousHash).toBe(committedAuditEntries[idx - 1].hash);
        }
      });
    });

    it('rejects all events when the entire 20-event batch is re-submitted (0 processed, 20 duplicates)', async () => {
      // 1. Submit initial 5 unique events
      const initialEvents: any[] = [];
      const timestamp = Date.now();

      for (let i = 1; i <= 5; i++) {
        const nonce = `resync_nonce_${i}`;
        const payload = { health: 85 };
        const signature = signPayload(payload, timestamp, nonce, deviceSecret);
        initialEvents.push({
          eventId: `init_${i}`,
          nonce,
          type: 'telemetry',
          payload,
          timestamp,
          signature,
        });
      }

      const req1 = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp,
          events: initialEvents,
        }),
      });

      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.processedCount).toBe(5);
      expect(json1.duplicateCount).toBe(0);

      // 2. Re-submit the EXACT same batch
      const req2 = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp,
          events: initialEvents,
        }),
      });

      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.processedCount).toBe(0);
      expect(json2.duplicateCount).toBe(5);

      // Verify audit entries remain exactly 5
      const count = await AuditLedger.countDocuments({
        deviceId: testDevice._id.toString(),
      });
      expect(count).toBe(5);
    });

    it('detects tampering in audit ledger hash chain if records are modified in database', async () => {
      // 1. Commit 3 valid events
      const events: any[] = [];
      const timestamp = Date.now();

      for (let i = 1; i <= 3; i++) {
        const nonce = `tamper_chain_${i}_${Date.now()}`;
        const payload = { count: i };
        const signature = signPayload(payload, timestamp, nonce, deviceSecret);
        events.push({
          eventId: `chain_${i}`,
          nonce,
          type: 'status',
          payload,
          timestamp,
          signature,
        });
      }

      await POST(
        new NextRequest('http://localhost:3000/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: testDevice._id.toString(),
            timestamp,
            events,
          }),
        })
      );

      // Verify initial chain is valid
      const initialIntegrity = await verifyLedgerIntegrity();
      expect(initialIntegrity.valid).toBe(true);

      // 2. Adversary directly tampers with block 2's payload in MongoDB
      const block2 = await AuditLedger.findOne({ sequence: 2 });
      expect(block2).not.toBeNull();
      block2!.payload = { count: 9999, malicious: true };
      await block2!.save();

      // 3. Chain verification must detect the tampering
      const tamperedIntegrity = await verifyLedgerIntegrity();
      expect(tamperedIntegrity.valid).toBe(false);
      expect(tamperedIntegrity.brokenSequence).toBe(2);
      expect(tamperedIntegrity.error).toMatch(/hash tampered/i);
    });
  });
});
