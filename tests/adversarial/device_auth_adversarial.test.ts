import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { POST } from '@/app/api/sync/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import Device from '@/models/Device';
import AuditLedger from '@/models/AuditLedger';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';
import {
  generateDeviceSecret,
  canonicalizePayload,
  createSigningString,
  signPayload,
  verifyDeviceSignature,
  authenticateDeviceSubmission,
} from '@/lib/device_auth';

describe('Adversarial Device Authentication & Attestation Security Suite', () => {
  let testUser: any;
  let testDevice: any;
  let validSecretKey: string;

  beforeAll(async () => {
    await connectDB();
    await AuditLedger.init();

    testUser = await User.create({
      name: 'Adversarial Test User',
      email: `adversarial_${Date.now()}@example.com`,
      password: 'password123',
      totalEcoCoins: 1000,
      devicesOwned: 1,
      devicesRecycled: 0,
      co2Saved: 0,
    });

    validSecretKey = generateDeviceSecret();

    testDevice = await Device.create({
      userId: testUser._id,
      name: 'IoT Eco Sensor Alpha',
      type: 'smartphone',
      health: 85,
      eolPrediction: '18 months',
      ecoCoins: 250,
      status: 'good',
      performanceScore: 88,
      secretKey: validSecretKey,
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

  describe('1. Attestation Security & Forgery Rejection via API (POST /api/sync)', () => {
    it('rejects forged signatures with 401 Unauthorized', async () => {
      const payload = { type: 'telemetry', health: 80, batteryHealth: 90 };
      const timestamp = Date.now();
      const nonce = `forged_nonce_${Date.now()}`;
      const forgedSignature = 'a'.repeat(64); // Completely fabricated signature

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp,
          nonce,
          signature: forgedSignature,
          payload,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized|invalid.*signature/i);

      // Verify no audit entry committed
      const auditCount = await AuditLedger.countDocuments({ deviceId: testDevice._id.toString() });
      expect(auditCount).toBe(0);
    });

    it('rejects payloads signed with an invalid device key with 401 Unauthorized', async () => {
      const payload = { type: 'telemetry', health: 75 };
      const timestamp = Date.now();
      const nonce = `invalid_key_nonce_${Date.now()}`;
      
      // Attacker signs payload with their own unauthorized secret key
      const attackerSecretKey = generateDeviceSecret();
      const signatureWithAttackerKey = signPayload(payload, timestamp, nonce, attackerSecretKey);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp,
          nonce,
          signature: signatureWithAttackerKey,
          payload,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized|invalid.*signature/i);

      const auditCount = await AuditLedger.countDocuments({ deviceId: testDevice._id.toString() });
      expect(auditCount).toBe(0);
    });

    it('rejects tampered payload quantities with 401 Unauthorized', async () => {
      // Device legitimately signs a recycling event with quantity: 1
      const originalPayload = {
        action: 'recycle_batch',
        quantity: 1,
        ecoCoinsExpected: 250,
      };
      const timestamp = Date.now();
      const nonce = `tamper_nonce_${Date.now()}`;
      const legitimateSignature = signPayload(originalPayload, timestamp, nonce, validSecretKey);

      // Adversary intercepts transmission and alters quantity to 100
      const tamperedPayload = {
        action: 'recycle_batch',
        quantity: 100, // Tampered!
        ecoCoinsExpected: 250,
      };

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp,
          nonce,
          signature: legitimateSignature, // Original signature
          payload: tamperedPayload,      // Tampered payload!
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized|invalid.*signature/i);

      // Verify no changes committed
      const auditCount = await AuditLedger.countDocuments({ deviceId: testDevice._id.toString() });
      expect(auditCount).toBe(0);
    });

    it('rejects tampered payload properties via HTTP headers attestation with 401 Unauthorized', async () => {
      const originalPayload = { quantity: 5, unit: 'kg' };
      const timestamp = Date.now();
      const nonce = `header_tamper_${Date.now()}`;
      const validSig = signPayload(originalPayload, timestamp, nonce, validSecretKey);

      // Attacker intercepts and replaces body with altered quantity
      const alteredBody = { quantity: 50, unit: 'kg' };

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': testDevice._id.toString(),
          'x-device-timestamp': String(timestamp),
          'x-device-nonce': nonce,
          'x-device-signature': validSig,
        },
        body: JSON.stringify(alteredBody),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized|invalid.*signature/i);
    });

    it('rejects attestation attempts for unknown or non-existent deviceId with 401 Unauthorized', async () => {
      const nonExistentDeviceId = new mongoose.Types.ObjectId().toString();
      const payload = { status: 'check' };
      const timestamp = Date.now();
      const nonce = `unknown_dev_${Date.now()}`;
      const signature = signPayload(payload, timestamp, nonce, validSecretKey);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: nonExistentDeviceId,
          timestamp,
          nonce,
          signature,
          payload,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unknown device/i);
    });

    it('rejects attestation when device has no configured secretKey with 401 Unauthorized', async () => {
      const deviceWithoutKey = await Device.create({
        userId: testUser._id,
        name: 'Keyless Device',
        type: 'laptop',
        health: 90,
        eolPrediction: '24 months',
        ecoCoins: 300,
        performanceScore: 85,
        secretKey: '',
      });

      const payload = { test: true };
      const timestamp = Date.now();
      const nonce = `no_key_${Date.now()}`;
      const signature = 'b'.repeat(64);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceWithoutKey._id.toString(),
          timestamp,
          nonce,
          signature,
          payload,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/no configured secret key/i);

      await Device.findByIdAndDelete(deviceWithoutKey._id);
    });

    it('rejects submissions with missing signature or attestation parameters with 401 Unauthorized', async () => {
      // Missing signature
      const reqNoSig = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp: Date.now(),
          nonce: 'missing_sig_nonce',
          payload: { health: 70 },
        }),
      });

      const resNoSig = await POST(reqNoSig);
      expect(resNoSig.status).toBe(401);

      // Missing deviceId
      const reqNoDev = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Date.now(),
          nonce: 'missing_dev_nonce',
          signature: 'c'.repeat(64),
          payload: { health: 70 },
        }),
      });

      const resNoDev = await POST(reqNoDev);
      expect(resNoDev.status).toBe(401);
    });

    it('accepts authentic, untampered signed payloads with 200 OK', async () => {
      const payload = { type: 'telemetry', health: 92, batteryHealth: 94 };
      const timestamp = Date.now();
      const nonce = `authentic_nonce_${Date.now()}`;
      const signature = signPayload(payload, timestamp, nonce, validSecretKey);

      const req = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: testDevice._id.toString(),
          timestamp,
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

      // Verify device health was updated
      const updatedDevice = await Device.findById(testDevice._id);
      expect(updatedDevice?.health).toBe(92);
      expect(updatedDevice?.batteryHealth).toBe(94);

      // Verify audit entry was committed
      const auditEntry = await AuditLedger.findOne({ nonce });
      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.hash).toBeDefined();
    });
  });

  describe('2. Cryptographic Unit Tests for Device Authentication (device_auth.ts)', () => {
    it('canonicalizePayload recursively and deterministically sorts keys', () => {
      const unsorted1 = { b: 2, a: 1, c: { z: 26, y: 25 } };
      const unsorted2 = { c: { y: 25, z: 26 }, a: 1, b: 2 };

      const canon1 = canonicalizePayload(unsorted1);
      const canon2 = canonicalizePayload(unsorted2);

      expect(canon1).toBe(canon2);
      expect(canon1).toBe('{"a":1,"b":2,"c":{"y":25,"z":26}}');

      // Arrays preserve order, elements are canonicalized
      const arrPayload = [{ d: 4, c: 3 }, { b: 2, a: 1 }];
      expect(canonicalizePayload(arrPayload)).toBe('[{"c":3,"d":4},{"a":1,"b":2}]');

      // Handles primitives and nulls
      expect(canonicalizePayload(null)).toBe('');
      expect(canonicalizePayload(undefined)).toBe('');
      expect(canonicalizePayload(123)).toBe('123');
      expect(canonicalizePayload('raw_string')).toBe('raw_string');
    });

    it('signPayload produces reproducible HMAC-SHA256 digests', () => {
      const payload = { metric: 'co2', value: 12.5 };
      const timestamp = 1729840000000;
      const nonce = 'reproducible_nonce_01';
      const secret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const sig1 = signPayload(payload, timestamp, nonce, secret);
      const sig2 = signPayload(payload, timestamp, nonce, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(sig1)).toBe(true);

      expect(() => signPayload(payload, timestamp, nonce, '')).toThrow(/required/i);
    });

    it('verifyDeviceSignature returns false for any parameter tampering', () => {
      const payload = { quantity: 10, item: 'e-waste' };
      const timestamp = 1729840000000;
      const nonce = 'strict_nonce_1';
      const secret = validSecretKey;
      const validSig = signPayload(payload, timestamp, nonce, secret);

      // Exact match passes
      expect(verifyDeviceSignature({ payload, timestamp, nonce, signature: validSig, secretKey: secret })).toBe(true);

      // Tampered payload quantity fails
      expect(verifyDeviceSignature({ payload: { quantity: 11, item: 'e-waste' }, timestamp, nonce, signature: validSig, secretKey: secret })).toBe(false);

      // Tampered timestamp fails
      expect(verifyDeviceSignature({ payload, timestamp: timestamp + 1000, nonce, signature: validSig, secretKey: secret })).toBe(false);

      // Tampered nonce fails
      expect(verifyDeviceSignature({ payload, timestamp, nonce: 'different_nonce', signature: validSig, secretKey: secret })).toBe(false);

      // Invalid secret key fails
      expect(verifyDeviceSignature({ payload, timestamp, nonce, signature: validSig, secretKey: generateDeviceSecret() })).toBe(false);

      // Corrupted signature fails
      const corruptedSig = validSig.slice(0, -2) + (validSig.endsWith('0') ? '1' : '0');
      expect(verifyDeviceSignature({ payload, timestamp, nonce, signature: corruptedSig, secretKey: secret })).toBe(false);

      // Malformed / non-hex signature fails safely without crashing
      expect(verifyDeviceSignature({ payload, timestamp, nonce, signature: 'not-hex!!', secretKey: secret })).toBe(false);
      expect(verifyDeviceSignature({ payload, timestamp, nonce, signature: '', secretKey: secret })).toBe(false);
    });

    it('authenticateDeviceSubmission helper correctly rejects unauthorized credentials', async () => {
      const payload = { test: 'auth' };
      const timestamp = Date.now();
      const nonce = `auth_helper_${Date.now()}`;

      // 1. Missing credentials
      const missingRes = await authenticateDeviceSubmission({ deviceId: testDevice._id.toString() });
      expect(missingRes.authorized).toBe(false);
      expect(missingRes.status).toBe(401);

      // 2. Forged signature
      const forgedRes = await authenticateDeviceSubmission({
        deviceId: testDevice._id.toString(),
        payload,
        timestamp,
        nonce,
        signature: 'f'.repeat(64),
      });
      expect(forgedRes.authorized).toBe(false);
      expect(forgedRes.status).toBe(401);

      // 3. Valid submission
      const validSig = signPayload(payload, timestamp, nonce, validSecretKey);
      const validRes = await authenticateDeviceSubmission({
        deviceId: testDevice._id.toString(),
        payload,
        timestamp,
        nonce,
        signature: validSig,
      });
      expect(validRes.authorized).toBe(true);
      expect(validRes.status).toBe(200);
      expect(validRes.device._id.toString()).toBe(testDevice._id.toString());
    });
  });
});
