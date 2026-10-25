import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';

function createRequest(url: string, body: any) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Auth API Routes Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testPassword = 'password123';

  it('rejects registration when fields are missing', async () => {
    const req = createRequest('http://localhost:3000/api/auth/register', {
      name: 'Incomplete',
    });
    const res = await registerHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it('registers a new user successfully', async () => {
    const req = createRequest('http://localhost:3000/api/auth/register', {
      name: 'Auth Test User',
      email: testEmail,
      password: testPassword,
    });
    const res = await registerHandler(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(testEmail);
    expect(json.data.totalEcoCoins).toBe(0);
  });

  it('rejects registration with a duplicate email', async () => {
    const req = createRequest('http://localhost:3000/api/auth/register', {
      name: 'Duplicate User',
      email: testEmail,
      password: testPassword,
    });
    const res = await registerHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it('rejects login with missing credentials', async () => {
    const req = createRequest('http://localhost:3000/api/auth/login', {
      email: testEmail,
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(400);
  });

  it('rejects login with invalid password', async () => {
    const req = createRequest('http://localhost:3000/api/auth/login', {
      email: testEmail,
      password: 'wrongpassword',
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(401);
  });

  it('logs in successfully with valid credentials', async () => {
    const req = createRequest('http://localhost:3000/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(testEmail);
    expect(json.data.password).toBeUndefined();

    // Clean up
    await User.deleteOne({ email: testEmail });
  });
});
