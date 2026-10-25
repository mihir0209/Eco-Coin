import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { GET, POST } from '@/app/api/transactions/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

describe('Transactions API Suite', () => {
  let testUser: any;

  beforeAll(async () => {
    await connectDB();
    testUser = await User.create({
      name: 'Transaction Tester',
      email: `txtest_${Date.now()}@example.com`,
      password: 'password123',
    });
  });

  afterAll(async () => {
    if (testUser) {
      await Transaction.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  it('creates an earn transaction', async () => {
    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        userId: testUser._id.toString(),
        type: 'earn',
        amount: 250,
        description: 'Recycled old laptop',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.amount).toBe(250);
  });

  it('lists transactions for user with populated refs', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/transactions?userId=${testUser._id.toString()}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
    expect(json.data[0].type).toBe('earn');
  });

  it('filters transactions by type', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/transactions?userId=${testUser._id.toString()}&type=redeem`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(0);
  });
});
