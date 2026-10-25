import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { POST as carbonMintHandler } from '@/app/api/carbon/mint/route';
import { verifyAndMintCarbonCredits, CARBON_RULES } from '@/lib/carbon_verifier';
import User from '@/models/User';
import CarbonMintRecord from '@/models/CarbonMintRecord';
import Transaction from '@/models/Transaction';
import { NextRequest } from 'next/server';

describe('Adversarial Carbon Offset Minting & Capacity Defense Suite', () => {
  beforeAll(async () => {
    await connectDB();
    await CarbonMintRecord.init();
    await User.init();
    await Transaction.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('atomically mints eco-points for verified solar generation within capacity', async () => {
    const user = await User.create({
      name: 'Solar Producer',
      email: `solar_mint_${Date.now()}@test.com`,
      password: 'password123',
      totalEcoCoins: 50,
    });

    const req = new NextRequest('http://localhost:3000/api/carbon/mint', {
      method: 'POST',
      body: JSON.stringify({
        userId: user._id.toString(),
        deviceId: `solar-panel-${Date.now()}`,
        activityType: 'solar_kwh',
        unitsClaimed: 25, // 25 kWh -> 25 * 4 = 100 coins, 25 * 400 = 10,000g CO2
      }),
    });

    const res = await carbonMintHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.coinsMinted).toBe(100);
    expect(data.co2GramsAvoided).toBe(10000);
    expect(data.newTotalBalance).toBe(150); // 50 + 100
    expect(data.attestationHash).toBeDefined();

    // Verify persisted database record
    const record = await CarbonMintRecord.findOne({ userId: user._id.toString() });
    expect(record).not.toBeNull();
    expect(record?.unitsClaimed).toBe(25);
  });

  it('rejects fraudulent claims exceeding single-transaction physical capacity', async () => {
    const user = await User.create({
      name: 'Fraudulent Solar Spammer',
      email: `solar_fraud_${Date.now()}@test.com`,
      password: 'password123',
      totalEcoCoins: 0,
    });

    const req = new NextRequest('http://localhost:3000/api/carbon/mint', {
      method: 'POST',
      body: JSON.stringify({
        userId: user._id.toString(),
        deviceId: `solar-spammer-${Date.now()}`,
        activityType: 'solar_kwh',
        unitsClaimed: 5000, // Exceeds max 150 kWh/day
      }),
    });

    const res = await carbonMintHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('CAPACITY_LIMIT_EXCEEDED');
  });

  it('enforces 24-hour cumulative capacity ceiling across multiple claims', async () => {
    const user = await User.create({
      name: 'Batch Recycler',
      email: `recycler_${Date.now()}@test.com`,
      password: 'password123',
      totalEcoCoins: 0,
    });

    const deviceId = `smart-bin-${Date.now()}`;

    // Claim 1: 400 kg (Allowed, limit is 500 kg)
    const res1 = await verifyAndMintCarbonCredits({
      userId: user._id.toString(),
      deviceId,
      activityType: 'recycling_kg',
      unitsClaimed: 400,
    });
    expect(res1.success).toBe(true);

    // Claim 2: 150 kg (400 + 150 = 550 kg > 500 kg limit -> MUST FAIL)
    const res2 = await verifyAndMintCarbonCredits({
      userId: user._id.toString(),
      deviceId,
      activityType: 'recycling_kg',
      unitsClaimed: 150,
    });
    expect(res2.success).toBe(false);
    expect(res2.code).toBe('CAPACITY_LIMIT_EXCEEDED');
  });

  it('rejects zero or negative claims', async () => {
    const res = await verifyAndMintCarbonCredits({
      userId: 'test_user_id',
      deviceId: 'test_device',
      activityType: 'ev_km',
      unitsClaimed: -50,
    });
    expect(res.success).toBe(false);
    expect(res.code).toBe('INVALID_UNITS');
  });
});
