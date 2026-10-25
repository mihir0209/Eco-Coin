import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Device from '@/models/Device';
import DeviceCode from '@/models/DeviceCode';

describe('Local Database & Connection Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('connects to local database successfully', async () => {
    const conn = await connectDB();
    expect(conn.connection.readyState).toBe(1);
    expect(conn.connection.name).toBe('ecocoin');
  });

  it('reuses the cached connection across repeated calls', async () => {
    const conn1 = await connectDB();
    const conn2 = await connectDB();
    expect(conn1).toBe(conn2);
  });

  it('auto-seeds the initial demo user if database is fresh', async () => {
    const user = await User.findOne({ email: 'mihir.patil22@pccoepune.org' });
    expect(user).not.toBeNull();
    expect(user?.name).toBe('Mihir Patil');
    expect(user?.totalEcoCoins).toBe(1250);
  });

  it('contains seeded demo devices and device codes', async () => {
    const devices = await Device.find({});
    expect(devices.length).toBeGreaterThanOrEqual(3);

    const codes = await DeviceCode.find({});
    expect(codes.length).toBeGreaterThanOrEqual(10);
  });
});
