import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { POST as redeemHandler } from '@/app/api/rewards/redeem/route';
import { NextRequest } from 'next/server';
import Reward from '@/models/Reward';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

describe('Adversarial Reward Double-Spend & Idempotency Settlement Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('blocks parallel race conditions: exactly 1 redemption succeeds out of 10 concurrent attempts', async () => {
    const user = await User.create({
      name: 'Double Spend Attacker',
      email: `attacker_${Date.now()}@test.com`,
      password: 'password123',
      totalEcoCoins: 100, // Only enough for 1 redemption
    });

    const reward = await Reward.create({
      title: 'Limited Solar Charger',
      description: 'Solar charger reward',
      costInCoins: 100,
      category: 'environmental',
      isActive: true,
    });

    try {
      // Fire 10 simultaneous redemption requests
      const requests = Array.from({ length: 10 }).map((_, idx) => {
        const req = new NextRequest('http://localhost:3000/api/rewards/redeem', {
          method: 'POST',
          body: JSON.stringify({
            userId: user._id.toString(),
            rewardId: reward._id.toString(),
            idempotencyKey: `race_nonce_${idx}_${Date.now()}`,
          }),
        });
        return redeemHandler(req);
      });

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      const successfulCount = statuses.filter((s) => s === 200).length;
      const rejectedCount = statuses.filter((s) => s === 400 || s === 409).length;

      expect(successfulCount).toBe(1);
      expect(rejectedCount).toBe(9);

      // Verify final balance is exactly 0 and never went negative
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.totalEcoCoins).toBe(0);

      // Verify exactly 1 transaction was logged
      const txs = await Transaction.find({ userId: user._id, type: 'redeem' });
      expect(txs.length).toBe(1);
      expect(txs[0].amount).toBe(-100);
      expect(txs[0].receiptHash).toBeDefined();
    } finally {
      await Transaction.deleteMany({ userId: user._id });
      await User.findByIdAndDelete(user._id);
      await Reward.findByIdAndDelete(reward._id);
    }
  });

  it('guarantees idempotency: retrying identical idempotencyKey does not double-charge balance', async () => {
    const user = await User.create({
      name: 'Idempotency Tester',
      email: `idempotency_${Date.now()}@test.com`,
      password: 'password123',
      totalEcoCoins: 200,
    });

    const reward = await Reward.create({
      title: 'Organic Tote Bag',
      description: 'Eco-friendly cotton tote',
      costInCoins: 60,
      category: 'environmental',
      isActive: true,
    });

    const fixedIdempotencyKey = `idem_key_${Date.now()}_secure`;

    try {
      // Request 1: initial submission
      const req1 = new NextRequest('http://localhost:3000/api/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify({
          userId: user._id.toString(),
          rewardId: reward._id.toString(),
          idempotencyKey: fixedIdempotencyKey,
        }),
      });

      const res1 = await redeemHandler(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.data.coinsDeducted).toBe(60);
      expect(json1.data.newBalance).toBe(140);
      const receiptHash1 = json1.data.receiptHash;
      expect(receiptHash1).toBeDefined();

      // Request 2: duplicate submission with same idempotency key (network retry simulation)
      const req2 = new NextRequest('http://localhost:3000/api/rewards/redeem', {
        method: 'POST',
        headers: {
          'X-Idempotency-Key': fixedIdempotencyKey,
        },
        body: JSON.stringify({
          userId: user._id.toString(),
          rewardId: reward._id.toString(),
        }),
      });

      const res2 = await redeemHandler(req2);
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.idempotent).toBe(true);
      expect(json2.data.receiptHash).toBe(receiptHash1);

      // Verify balance was only deducted ONCE
      const finalUser = await User.findById(user._id);
      expect(finalUser?.totalEcoCoins).toBe(140);

      // Verify only 1 transaction exists for this idempotency key
      const txs = await Transaction.find({ idempotencyKey: fixedIdempotencyKey });
      expect(txs.length).toBe(1);
    } finally {
      await Transaction.deleteMany({ userId: user._id });
      await User.findByIdAndDelete(user._id);
      await Reward.findByIdAndDelete(reward._id);
    }
  });

  it('rejects redemption of inactive rewards', async () => {
    const user = await User.create({
      name: 'Inactive Tester',
      email: `inactive_${Date.now()}@test.com`,
      password: 'password123',
      totalEcoCoins: 500,
    });

    const inactiveReward = await Reward.create({
      title: 'Discontinued Bamboo Cutlery',
      description: 'Out of circulation',
      costInCoins: 50,
      category: 'other',
      isActive: false,
    });

    try {
      const req = new NextRequest('http://localhost:3000/api/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify({
          userId: user._id.toString(),
          rewardId: inactiveReward._id.toString(),
        }),
      });

      const res = await redeemHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/no longer active/i);

      // Balance untouched
      const checkUser = await User.findById(user._id);
      expect(checkUser?.totalEcoCoins).toBe(500);
    } finally {
      await User.findByIdAndDelete(user._id);
      await Reward.findByIdAndDelete(inactiveReward._id);
    }
  });

  it('cryptographic receipt verification: validates HMAC-SHA256 signature integrity', async () => {
    const user = await User.create({
      name: 'HMAC Tester',
      email: `hmac_${Date.now()}@test.com`,
      password: 'password123',
      totalEcoCoins: 100,
    });

    const reward = await Reward.create({
      title: 'Tree Certificate',
      description: 'Verified plantation',
      costInCoins: 40,
      category: 'environmental',
      isActive: true,
    });

    const nonce = `audit_sig_${Date.now()}`;

    try {
      const req = new NextRequest('http://localhost:3000/api/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify({
          userId: user._id.toString(),
          rewardId: reward._id.toString(),
          idempotencyKey: nonce,
        }),
      });

      const res = await redeemHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      const { receiptHash, settledAt } = json.data;
      expect(typeof receiptHash).toBe('string');
      expect(receiptHash.length).toBe(64); // SHA-256 hex string

      // Recompute expected HMAC
      const payload = `${user._id.toString()}:${reward._id.toString()}:40:${new Date(settledAt).toISOString()}:${nonce}`;
      const expectedHash = crypto
        .createHmac('sha256', process.env.ATTESTATION_SECRET || 'eco-coin-settlement-secret')
        .update(payload)
        .digest('hex');

      expect(receiptHash).toBe(expectedHash);
    } finally {
      await Transaction.deleteMany({ userId: user._id });
      await User.findByIdAndDelete(user._id);
      await Reward.findByIdAndDelete(reward._id);
    }
  });
});
