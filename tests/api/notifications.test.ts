import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { GET, POST, PUT, DELETE } from '@/app/api/notifications/route';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import Device from '@/models/Device';
import Notification from '@/models/Notification';

describe('Notifications API Suite', () => {
  let testUser: any;
  let testDevice: any;
  let testNotificationId: string;

  beforeAll(async () => {
    await connectDB();
    testUser = await User.create({
      name: 'Notification Tester',
      email: `notiftest_${Date.now()}@example.com`,
      password: 'password123',
    });
    testDevice = await Device.create({
      userId: testUser._id,
      name: 'Device For Notif',
      type: 'smartphone',
      health: 30,
      eolPrediction: '1 month',
      ecoCoins: 100,
      status: 'critical',
      performanceScore: 50,
    });
  });

  afterAll(async () => {
    if (testUser) {
      await Notification.deleteMany({ userId: testUser._id });
      await Device.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  it('creates a new notification', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        userId: testUser._id.toString(),
        deviceId: testDevice._id.toString(),
        deviceName: testDevice.name,
        message: 'Device needs urgent recycling',
        type: 'critical',
        ecoCoins: 100,
        isRead: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    testNotificationId = json.data._id;
  });

  it('lists notifications by userId', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/notifications?userId=${testUser._id.toString()}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
    expect(json.data[0].deviceName).toBe(testDevice.name);
  });

  it('marks a notification as read', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications', {
      method: 'PUT',
      body: JSON.stringify({
        id: testNotificationId,
        isRead: true,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isRead).toBe(true);
  });

  it('deletes a notification', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/notifications?id=${testNotificationId}`,
      { method: 'DELETE' }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const check = await Notification.findById(testNotificationId);
    expect(check).toBeNull();
  });
});
