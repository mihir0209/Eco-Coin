import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { GET, POST, PUT, DELETE } from '@/app/api/devices/route';
import { POST as registerHandler } from '@/app/api/devices/register/route';
import { POST as recycleHandler } from '@/app/api/devices/recycle/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import Device from '@/models/Device';
import DeviceCode from '@/models/DeviceCode';
import Transaction from '@/models/Transaction';

describe('Devices API Suite', () => {
  let testUser: any;

  beforeAll(async () => {
    await connectDB();
    testUser = await User.create({
      name: 'Device Test User',
      email: `devicetest_${Date.now()}@example.com`,
      password: 'password123',
      totalEcoCoins: 500,
      devicesOwned: 0,
      devicesRecycled: 0,
      co2Saved: 0,
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

  it('creates a new device and increments user devicesOwned count', async () => {
    const req = new NextRequest('http://localhost:3000/api/devices', {
      method: 'POST',
      body: JSON.stringify({
        userId: testUser._id.toString(),
        name: 'Test iPad Air',
        type: 'tablet',
        health: 95,
        eolPrediction: '24 months',
        ecoCoins: 200,
        status: 'good',
        performanceScore: 92,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Test iPad Air');

    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser?.devicesOwned).toBe(1);
  });

  it('retrieves devices filtered by userId', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/devices?userId=${testUser._id.toString()}&isRecycled=false`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it('updates an existing device', async () => {
    const device = await Device.findOne({ userId: testUser._id });
    expect(device).not.toBeNull();

    const req = new NextRequest('http://localhost:3000/api/devices', {
      method: 'PUT',
      body: JSON.stringify({
        id: device!._id.toString(),
        health: 80,
        status: 'warning',
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.health).toBe(80);
    expect(json.data.status).toBe('warning');
  });

  it('registers a device using a valid manufacturer code', async () => {
    const testCodeStr = `TEST${Date.now().toString().slice(-4)}-1500`;
    await DeviceCode.create({
      code: testCodeStr,
      deviceType: 'smartphone',
      brand: 'Google',
      deviceModel: 'Pixel 8',
      ecoCoinsValue: 1500,
      specifications: { storage: '128GB' },
      isRegistered: false,
    });

    const req = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        code: testCodeStr,
        userId: testUser._id.toString(),
      }),
    });

    const initialCoins = (await User.findById(testUser._id))!.totalEcoCoins;
    const res = await registerHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify user balance incremented
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser?.totalEcoCoins).toBe(initialCoins + 1500);

    // Verify code marked registered
    const codeDoc = await DeviceCode.findOne({ code: testCodeStr });
    expect(codeDoc?.isRegistered).toBe(true);

    // Verify duplicate registration attempt fails
    const dupReq = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        code: testCodeStr,
        userId: testUser._id.toString(),
      }),
    });
    const dupRes = await registerHandler(dupReq);
    expect(dupRes.status).toBe(400);

    // Cleanup code
    await DeviceCode.deleteOne({ code: testCodeStr });
  });

  it('recycles a device and updates rewards & environmental stats', async () => {
    const device = await Device.findOne({
      userId: testUser._id,
      isRecycled: false,
    });
    expect(device).not.toBeNull();

    const userBefore = await User.findById(testUser._id);
    const initialCoins = userBefore!.totalEcoCoins;
    const initialRecycled = userBefore!.devicesRecycled;
    const initialCO2 = userBefore!.co2Saved;

    const req = new NextRequest('http://localhost:3000/api/devices/recycle', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: device!._id.toString(),
        userId: testUser._id.toString(),
      }),
    });

    const res = await recycleHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.coinsAwarded).toBe(device!.ecoCoins);

    const userAfter = await User.findById(testUser._id);
    expect(userAfter?.totalEcoCoins).toBe(initialCoins + device!.ecoCoins);
    expect(userAfter?.devicesRecycled).toBe(initialRecycled + 1);
    expect(userAfter?.co2Saved).toBe(initialCO2 + 0.5);

    // Prevents double recycling
    const retryReq = new NextRequest('http://localhost:3000/api/devices/recycle', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: device!._id.toString(),
        userId: testUser._id.toString(),
      }),
    });
    const retryRes = await recycleHandler(retryReq);
    expect(retryRes.status).toBe(400);
  });

  it('deletes a device and decrements user devicesOwned count', async () => {
    const newDevice = await Device.create({
      userId: testUser._id,
      name: 'Temp Device To Delete',
      type: 'monitor',
      health: 50,
      eolPrediction: '6 months',
      ecoCoins: 50,
      status: 'warning',
      performanceScore: 60,
    });
    await User.findByIdAndUpdate(testUser._id, { $inc: { devicesOwned: 1 } });

    const countBefore = (await User.findById(testUser._id))!.devicesOwned;

    const req = new NextRequest(
      `http://localhost:3000/api/devices?id=${newDevice._id.toString()}`,
      { method: 'DELETE' }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const countAfter = (await User.findById(testUser._id))!.devicesOwned;
    expect(countAfter).toBe(countBefore - 1);
  });
});
