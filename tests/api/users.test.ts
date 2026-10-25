import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { GET, POST, PUT, DELETE } from '@/app/api/users/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';

describe('Users API Suite', () => {
  let createdUserId: string;
  const userEmail = `usertest_${Date.now()}@example.com`;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    if (createdUserId) {
      await User.findByIdAndDelete(createdUserId);
    }
    await disconnectDB();
  });

  it('creates a user via POST /api/users', async () => {
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'User CRUD Test',
        email: userEmail,
        password: 'securePassword123',
        totalEcoCoins: 100,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(userEmail);
    createdUserId = json.data._id;
  });

  it('gets user by id', async () => {
    const req = new NextRequest(`http://localhost:3000/api/users?id=${createdUserId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data._id).toBe(createdUserId);
    expect(json.data.name).toBe('User CRUD Test');
  });

  it('gets user by email', async () => {
    const req = new NextRequest(`http://localhost:3000/api/users?email=${userEmail}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.email).toBe(userEmail);
  });

  it('updates a user via PUT /api/users', async () => {
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'PUT',
      body: JSON.stringify({
        id: createdUserId,
        name: 'Updated CRUD Name',
        totalEcoCoins: 150,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('Updated CRUD Name');
    expect(json.data.totalEcoCoins).toBe(150);
  });

  it('deletes a user via DELETE /api/users', async () => {
    const req = new NextRequest(`http://localhost:3000/api/users?id=${createdUserId}`, {
      method: 'DELETE',
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const check = await User.findById(createdUserId);
    expect(check).toBeNull();
    createdUserId = '';
  });
});
