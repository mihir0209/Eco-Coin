import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { POST, GET } from '@/app/api/sync/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import Device from '@/models/Device';
import Transaction from '@/models/Transaction';
import AuditLedger from '@/models/AuditLedger';
import { generateDeviceSecret, signPayload } from '@/lib/device_auth';
import mongoose from 'mongoose';

describe('Batch Sync API Suite (/api/sync)', () => {
  let testUser: any;
  let testDevice: any;
  const testSecret = generateDeviceSecret();

  beforeAll(async () => {
    await connectDB();
    testUser = await User.create({
      name: 'Batch Sync User',
      email: `syncuser_${Date.now()}@example.com`,
      password: 'password123',
      totalEcoCoins: 100,
      devicesOwned: 1,
      devicesRecycled: 0,
      co2Saved: 0,
    });

    testDevice = await Device.create({
      userId: testUser._id,
      name: 'Batch Synced Tablet',
      type: 'tablet',
      health: 80,
      eolPrediction: '12 months',
      ecoCoins: 250,
      status: 'good',
      performanceScore: 80,
      isRecycled: false,
      secretKey: testSecret,
    });
  });

  afterAll(async () => {
    if (testDevice) {
      await Device.findByIdAndDelete(testDevice._id);
      await AuditLedger.deleteMany({ deviceId: testDevice._id.toString() });
      await Transaction.deleteMany({ userId: testUser._id });
    }
    if (testUser) await User.findByIdAndDelete(testUser._id);
    await disconnectDB();
  });

  it('rejects request with 400 when deviceId or events array is missing', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    });
    const res1 = await POST(req1);
    expect([400, 401]).toContain(res1.status);

    const req2 = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({ deviceId: testDevice._id.toString() }),
    });
    const res2 = await POST(req2);
    expect([400, 401]).toContain(res2.status);
  });

  it('rejects request with 401 when device is unknown', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: fakeId,
        events: [{ type: 'status', payload: {} }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects request with 401 when signature is invalid', async () => {
    const now = Date.now();
    const events = [{ type: 'telemetry', payload: { health: 70 } }];
    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp: now,
        nonce: `nonce_invalid_${now}`,
        signature: 'bad_signature_00000000000000000000000000000000000000000000000000000000',
        events,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects request with 400 when batch timestamp drift exceeds ±300s', async () => {
    const staleTime = Date.now() - 400 * 1000;
    const events = [{ type: 'telemetry', payload: { health: 70 } }];
    const nonce = `stale_sync_${Date.now()}`;
    const signature = signPayload(events, staleTime, nonce, testSecret);

    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp: staleTime,
        nonce,
        signature,
        events,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/exceeds acceptable window of ±300s/i);
  });

  it('successfully processes a batch of offline telemetry events and updates device state', async () => {
    const now = Date.now();
    const batchNonce = `batch_nonce_${now}`;
    const events = [
      {
        eventId: 'evt_telemetry_1',
        type: 'telemetry',
        payload: { health: 65, batteryHealth: 75, performanceScore: 70 },
        timestamp: now - 10000,
        nonce: `nonce_tel_1_${now}`,
      },
      {
        eventId: 'evt_telemetry_2',
        type: 'telemetry',
        payload: { health: 20, batteryHealth: 50, performanceScore: 40 },
        timestamp: now - 5000,
        nonce: `nonce_tel_2_${now}`,
      },
    ];

    const signature = signPayload(events, now, batchNonce, testSecret);

    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp: now,
        nonce: batchNonce,
        signature,
        events,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.processedCount).toBe(2);
    expect(json.duplicateCount).toBe(0);
    expect(json.results[0].status).toBe('processed');
    expect(json.results[1].status).toBe('processed');

    // Verify device health dropped to 20 and status updated to critical
    const updatedDevice = await Device.findById(testDevice._id);
    expect(updatedDevice?.health).toBe(20);
    expect(updatedDevice?.status).toBe('critical');
    expect(updatedDevice?.batteryHealth).toBe(50);
  });

  it('processes replayed events IDEMPOTENTLY without re-applying state changes', async () => {
    // Submit the EXACT same batch again
    const now = Date.now();
    const batchNonce = `replay_test_batch_${now}`;
    const duplicateEventNonce = `nonce_tel_1_${now - 1000}`; // let's use an already processed nonce
    // First, process once
    const firstEvents = [
      {
        eventId: 'evt_unique_100',
        type: 'telemetry',
        payload: { health: 30 },
        nonce: `nonce_unique_${now}`,
      },
    ];
    const firstSig = signPayload(firstEvents, now, batchNonce, testSecret);
    const firstReq = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp: now,
        nonce: batchNonce,
        signature: firstSig,
        events: firstEvents,
      }),
    });
    const firstRes = await POST(firstReq);
    expect(firstRes.status).toBe(200);
    const firstJson = await firstRes.json();
    expect(firstJson.processedCount).toBe(1);

    // Now re-submit the same event with same nonce
    const replayReq = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp: now,
        nonce: `new_batch_${now}`,
        signature: signPayload(firstEvents, now, `new_batch_${now}`, testSecret),
        events: firstEvents,
      }),
    });
    const replayRes = await POST(replayReq);
    expect(replayRes.status).toBe(200);
    const replayJson = await replayRes.json();
    expect(replayJson.processedCount).toBe(0);
    expect(replayJson.duplicateCount).toBe(1);
    expect(replayJson.results[0].status).toBe('already_processed');
    expect(replayJson.results[0].replayed).toBe(true);
  });

  it('handles offline batch recycling events and guarantees idempotency on duplicate submissions', async () => {
    const userBefore = await User.findById(testUser._id);
    const initialCoins = userBefore!.totalEcoCoins;

    const now = Date.now();
    const recycleNonce = `recycle_nonce_${now}`;
    const events = [
      {
        eventId: 'evt_recycle_01',
        type: 'recycle',
        payload: { reason: 'Offline EOL confirmation' },
        timestamp: now,
        nonce: recycleNonce,
      },
    ];

    const sig = signPayload(events, now, `batch_${now}`, testSecret);
    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp: now,
        nonce: `batch_${now}`,
        signature: sig,
        events,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.processedCount).toBe(1);

    const userAfter = await User.findById(testUser._id);
    expect(userAfter?.totalEcoCoins).toBe(initialCoins + testDevice.ecoCoins);

    // Re-submit the same recycle event
    const dupReq = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: testDevice._id.toString(),
        timestamp: now,
        nonce: `batch_retry_${now}`,
        signature: signPayload(events, now, `batch_retry_${now}`, testSecret),
        events,
      }),
    });
    const dupRes = await POST(dupReq);
    expect(dupRes.status).toBe(200);
    const dupJson = await dupRes.json();
    expect(dupJson.processedCount).toBe(0);
    expect(dupJson.duplicateCount).toBe(1);

    // Verify user was NOT double-credited coins!
    const userFinal = await User.findById(testUser._id);
    expect(userFinal?.totalEcoCoins).toBe(initialCoins + testDevice.ecoCoins);
  });

  it('GET /api/sync returns device ledger history and verified hash chain integrity', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/sync?deviceId=${testDevice._id.toString()}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.count).toBeGreaterThanOrEqual(1);
    expect(json.ledgerIntegrity.valid).toBe(true);
  });
});
