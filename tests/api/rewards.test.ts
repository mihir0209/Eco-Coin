import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { GET, POST, PUT, DELETE } from '@/app/api/rewards/route';
import { POST as redeemHandler } from '@/app/api/rewards/redeem/route';
import { NextRequest } from 'next/server';
import Reward from '@/models/Reward';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

describe('Rewards API Suite', () => {
  let testUser: any;
  let testReward: any;

  beforeAll(async () => {
    await connectDB();
    testUser = await User.create({
      name: 'Reward Test User',
      email: `rewardtest_${Date.now()}@example.com`,
      password: 'password123',
      totalEcoCoins: 200,
    });
  });

  afterAll(async () => {
    if (testUser) {
      await Transaction.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    if (testReward) {
      await Reward.findByIdAndDelete(testReward._id);
    }
    await disconnectDB();
  });

  it('creates a new reward', async () => {
    const req = new NextRequest('http://localhost:3000/api/rewards', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Plant 2 Trees',
        description: 'Plant two trees for reforestation',
        costInCoins: 75,
        category: 'environmental',
        isActive: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    testReward = json.data;
    expect(testReward.costInCoins).toBe(75);
  });

  it('lists active rewards', async () => {
    const req = new NextRequest('http://localhost:3000/api/rewards?isActive=true');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it('updates a reward', async () => {
    const req = new NextRequest('http://localhost:3000/api/rewards', {
      method: 'PUT',
      body: JSON.stringify({
        id: testReward._id,
        costInCoins: 80,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.costInCoins).toBe(80);
  });

  it('successfully redeems reward when user has enough coins', async () => {
    const initialCoins = testUser.totalEcoCoins; // 200
    const cost = 80;

    const req = new NextRequest('http://localhost:3000/api/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({
        rewardId: testReward._id,
        userId: testUser._id.toString(),
      }),
    });

    const res = await redeemHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.newBalance).toBe(initialCoins - cost);

    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser?.totalEcoCoins).toBe(initialCoins - cost);
  });

  it('rejects redemption when user has insufficient coins', async () => {
    // Current user balance is 120; try to redeem an expensive reward costing 500
    const expensiveReward = await Reward.create({
      title: 'Solar Panel Voucher',
      description: 'Huge solar rebate',
      costInCoins: 500,
      category: 'environmental',
      isActive: true,
    });

    const req = new NextRequest('http://localhost:3000/api/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({
        rewardId: expensiveReward._id.toString(),
        userId: testUser._id.toString(),
      }),
    });

    const res = await redeemHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/insufficient/i);

    await Reward.findByIdAndDelete(expensiveReward._id);
  });

  it('deletes a reward by ID', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/rewards?id=${testReward._id}`,
      { method: 'DELETE' }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const deleted = await Reward.findById(testReward._id);
    expect(deleted).toBeNull();
    testReward = null;
  });
});
