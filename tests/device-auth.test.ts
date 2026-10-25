import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import {
  generateDeviceSecret,
  canonicalizePayload,
  createSigningString,
  signPayload,
  verifyDeviceSignature,
  authenticateDeviceSubmission,
} from '@/lib/device_auth';
import Device from '@/models/Device';
import User from '@/models/User';
import mongoose from 'mongoose';

describe('Cryptographic Device Attestation Suite (lib/device_auth.ts)', () => {
  let testUser: any;
  let testDevice: any;
  const testSecret = generateDeviceSecret();

  beforeAll(async () => {
    await connectDB();
    testUser = await User.create({
      name: 'Crypto Attestation User',
      email: `crypto_${Date.now()}@example.com`,
      password: 'password123',
    });
    testDevice = await Device.create({
      userId: testUser._id,
      name: 'Crypto Attested iPhone',
      type: 'smartphone',
      health: 80,
      eolPrediction: '18 months',
      ecoCoins: 200,
      status: 'good',
      performanceScore: 85,
      secretKey: testSecret,
    });
  });

  afterAll(async () => {
    if (testDevice) await Device.findByIdAndDelete(testDevice._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);
    await disconnectDB();
  });

  it('generates secure 256-bit random hex secret keys', () => {
    const s1 = generateDeviceSecret();
    const s2 = generateDeviceSecret();
    expect(s1).toHaveLength(64);
    expect(s2).toHaveLength(64);
    expect(s1).not.toBe(s2);
  });

  it('deterministically canonicalizes payloads regardless of key ordering', () => {
    const obj1 = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const obj2 = { a: 1, c: { x: 10, y: 20 }, b: 2 };
    expect(canonicalizePayload(obj1)).toBe(canonicalizePayload(obj2));
    expect(canonicalizePayload(obj1)).toBe('{"a":1,"b":2,"c":{"x":10,"y":20}}');
  });

  it('creates signing message string with payload, timestamp, and nonce', () => {
    const str = createSigningString({ temp: 35 }, 1700000000, 'nonce_123');
    expect(str).toBe('{"temp":35}:1700000000:nonce_123');
  });

  it('signs payload and verifies HMAC-SHA256 signature successfully', () => {
    const payload = { batteryHealth: 90, cycles: 120 };
    const ts = Date.now();
    const nonce = 'random_nonce_abc';

    const signature = signPayload(payload, ts, nonce, testSecret);
    expect(signature).toHaveLength(64); // 32 bytes in hex

    const isValid = verifyDeviceSignature({
      payload,
      timestamp: ts,
      nonce,
      signature,
      secretKey: testSecret,
    });
    expect(isValid).toBe(true);
  });

  it('rejects tampered payload or altered nonce/timestamp', () => {
    const payload = { batteryHealth: 90 };
    const ts = Date.now();
    const nonce = 'valid_nonce';
    const sig = signPayload(payload, ts, nonce, testSecret);

    // Tampered payload
    expect(
      verifyDeviceSignature({
        payload: { batteryHealth: 89 },
        timestamp: ts,
        nonce,
        signature: sig,
        secretKey: testSecret,
      })
    ).toBe(false);

    // Tampered timestamp
    expect(
      verifyDeviceSignature({
        payload,
        timestamp: ts + 1000,
        nonce,
        signature: sig,
        secretKey: testSecret,
      })
    ).toBe(false);

    // Tampered nonce
    expect(
      verifyDeviceSignature({
        payload,
        timestamp: ts,
        nonce: 'altered_nonce',
        signature: sig,
        secretKey: testSecret,
      })
    ).toBe(false);

    // Wrong secret key
    expect(
      verifyDeviceSignature({
        payload,
        timestamp: ts,
        nonce,
        signature: sig,
        secretKey: generateDeviceSecret(),
      })
    ).toBe(false);
  });

  it('authenticates device submission from DB lookup with 200', async () => {
    const payload = { health: 75 };
    const ts = Date.now();
    const nonce = `nonce_${Date.now()}`;
    const signature = signPayload(payload, ts, nonce, testSecret);

    const result = await authenticateDeviceSubmission({
      deviceId: testDevice._id.toString(),
      payload,
      timestamp: ts,
      nonce,
      signature,
    });

    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
    expect(result.device._id.toString()).toBe(testDevice._id.toString());
  });

  it('rejects unauthorized submission with 401 when signature is invalid', async () => {
    const result = await authenticateDeviceSubmission({
      deviceId: testDevice._id.toString(),
      payload: { health: 75 },
      timestamp: Date.now(),
      nonce: 'nonce_xyz',
      signature: '0'.repeat(64),
    });

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toMatch(/signature verification failed/i);
  });

  it('rejects unauthorized submission with 401 when device is unknown', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const result = await authenticateDeviceSubmission({
      deviceId: fakeId,
      payload: { health: 75 },
      timestamp: Date.now(),
      nonce: 'nonce_xyz',
      signature: '0'.repeat(64),
    });

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toMatch(/unknown or unverified device/i);
  });

  it('rejects unauthorized submission with 401 when required fields are missing', async () => {
    const result = await authenticateDeviceSubmission({
      deviceId: testDevice._id.toString(),
      // missing nonce, timestamp, signature
    });

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
  });
});
