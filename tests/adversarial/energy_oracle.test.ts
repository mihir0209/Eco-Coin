import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EnergyTelemetry } from '@/models/EnergyTelemetry';
import User from '@/models/User';
import { EnergyOracleEngine } from '@/lib/energy_oracle';

let mongoServer: MongoMemoryServer;

beforeEach(async () => {
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
  await EnergyTelemetry.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Proof of Renewable Generation (PoEG) Oracle Engine', () => {
  it('verifies genuine solar meter telemetry and mints reward Eco-Coins', async () => {
    const user = await User.create({
      name: 'Solar Prosumer',
      email: 'solar@example.com',
      password: 'password123',
      totalEcoCoins: 50,
    });

    const timestamp = new Date().toISOString();
    const nonce = 'nonce-solar-101';
    const secret = 'mock-iot-shared-secret';
    const sig = EnergyOracleEngine.generateSignature('meter-solar-001', 50, timestamp, nonce, secret);

    const record = await EnergyOracleEngine.submitTelemetry({
      deviceId: 'meter-solar-001',
      deviceSignature: sig,
      generationType: 'solar',
      kwhGenerated: 50,
      peakCapacityKw: 100, // 100kW over 60 mins can produce up to ~105 kWh
      intervalMinutes: 60,
      timestamp,
      nonce,
      userId: user._id.toString(),
    });

    expect(record.status).toBe('verified');
    expect(record.ecoCoinsMinted).toBe(5); // 50 / 10 = 5 Eco-Coins

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.totalEcoCoins).toBe(55);
  });

  it('detects and flags physical generation anomaly exceeding peak nameplate capacity', async () => {
    const user = await User.create({
      name: 'Rogue Inverter',
      email: 'rogue@example.com',
      password: 'password123',
      totalEcoCoins: 0,
    });

    const timestamp = new Date().toISOString();
    const nonce = 'nonce-rogue-999';
    const secret = 'mock-iot-shared-secret';
    // Submitting 500 kWh from a 10kW inverter over 15 minutes (impossible)
    const sig = EnergyOracleEngine.generateSignature('meter-micro-solar', 500, timestamp, nonce, secret);

    const record = await EnergyOracleEngine.submitTelemetry({
      deviceId: 'meter-micro-solar',
      deviceSignature: sig,
      generationType: 'solar',
      kwhGenerated: 500,
      peakCapacityKw: 10,
      intervalMinutes: 15,
      timestamp,
      nonce,
      userId: user._id.toString(),
    });

    expect(record.status).toBe('anomalous');
    expect(record.ecoCoinsMinted).toBe(0);
    expect(record.anomalyReason).toContain('exceeds physical nameplate ceiling');

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.totalEcoCoins).toBe(0);
  });

  it('rejects replayed telemetry with duplicate nonces', async () => {
    const user = await User.create({
      name: 'Wind Farm Operator',
      email: 'wind@example.com',
      password: 'password123',
      totalEcoCoins: 100,
    });

    const timestamp = new Date().toISOString();
    const nonce = 'replay-nonce-001';
    const secret = 'mock-iot-shared-secret';
    const sig = EnergyOracleEngine.generateSignature('meter-wind-01', 80, timestamp, nonce, secret);

    await EnergyOracleEngine.submitTelemetry({
      deviceId: 'meter-wind-01',
      deviceSignature: sig,
      generationType: 'wind',
      kwhGenerated: 80,
      peakCapacityKw: 200,
      intervalMinutes: 60,
      timestamp,
      nonce,
      userId: user._id.toString(),
    });

    await expect(
      EnergyOracleEngine.submitTelemetry({
        deviceId: 'meter-wind-01',
        deviceSignature: sig,
        generationType: 'wind',
        kwhGenerated: 80,
        peakCapacityKw: 200,
        intervalMinutes: 60,
        timestamp,
        nonce,
        userId: user._id.toString(),
      })
    ).rejects.toThrow(/Replay attack detected/);
  });
});
