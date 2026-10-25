import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { GET } from '@/app/api/dashboard/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import Device from '@/models/Device';
import Transaction from '@/models/Transaction';

describe('Dashboard API Suite', () => {
  let testUser: any;

  beforeAll(async () => {
    await connectDB();
    testUser = await User.create({
      name: 'Dashboard Tester',
      email: `dashtest_${Date.now()}@example.com`,
      password: 'password123',
      totalEcoCoins: 350,
      devicesOwned: 2,
      devicesRecycled: 1,
      co2Saved: 1.5,
    });

    await Device.create([
      {
        userId: testUser._id,
        name: 'Active Phone',
        type: 'smartphone',
        health: 90,
        eolPrediction: '18 months',
        ecoCoins: 120,
        status: 'good',
        performanceScore: 90,
        isRecycled: false,
      },
      {
        userId: testUser._id,
        name: 'Recycled Monitor',
        type: 'monitor',
        health: 20,
        eolPrediction: '0 months',
        ecoCoins: 80,
        status: 'critical',
        performanceScore: 40,
        isRecycled: true,
      },
    ]);

    await Transaction.create({
      userId: testUser._id,
      type: 'earn',
      amount: 100,
      description: 'Current Month Bonus',
      timestamp: new Date(),
    });
  });

  afterAll(async () => {
    if (testUser) {
      await Device.deleteMany({ userId: testUser._id });
      await Transaction.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  it('rejects request when userId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/dashboard');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent userId', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const req = new NextRequest(`http://localhost:3000/api/dashboard?userId=${fakeId}`);
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns aggregated dashboard statistics for valid user', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/dashboard?userId=${testUser._id.toString()}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.name).toBe('Dashboard Tester');
    expect(json.data.devices.length).toBe(1);
    expect(json.data.recycledDevices.length).toBe(1);
    expect(json.data.earnings.allTime).toBe(350);
    expect(json.data.earnings.thisMonth).toBe(100);
    expect(json.data.recentTransactions.length).toBeGreaterThanOrEqual(1);
  });
});
