import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Device from '@/models/Device';
import DeviceCode from '@/models/DeviceCode';
import Reward from '@/models/Reward';
import Transaction from '@/models/Transaction';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

describe('Mongoose Models Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('User Model', () => {
    it('creates a user with valid attributes and default counts', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const user = await User.create({
        name: 'Test Tester',
        email,
        password: 'securepassword123',
      });

      expect(user._id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.totalEcoCoins).toBe(0);
      expect(user.devicesOwned).toBe(0);
      expect(user.devicesRecycled).toBe(0);
      expect(user.co2Saved).toBe(0);

      await User.findByIdAndDelete(user._id);
    });

    it('fails when email is missing or password is too short', async () => {
      await expect(
        User.create({
          name: 'Invalid User',
          password: '123',
        })
      ).rejects.toThrow();
    });
  });

  describe('Device Model', () => {
    it('creates a device with enum validation', async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const device = await Device.create({
        userId: testUserId,
        name: 'MacBook Pro 16',
        type: 'laptop',
        health: 85,
        eolPrediction: '12 months',
        ecoCoins: 450,
        status: 'good',
        performanceScore: 90,
      });

      expect(device._id).toBeDefined();
      expect(device.type).toBe('laptop');
      expect(device.isRecycled).toBe(false);

      await Device.findByIdAndDelete(device._id);
    });

    it('rejects invalid device types', async () => {
      const testUserId = new mongoose.Types.ObjectId();
      await expect(
        Device.create({
          userId: testUserId,
          name: 'Microwave',
          type: 'kitchen_appliance' as any,
          health: 50,
          eolPrediction: '1 year',
          ecoCoins: 100,
          performanceScore: 50,
        })
      ).rejects.toThrow();
    });
  });

  describe('DeviceCode Model', () => {
    it('validates manufacturer code regex format ABCD1234-2500', async () => {
      const uniqueCode = `CODE${Date.now().toString().slice(-4)}-2500`;
      const deviceCode = await DeviceCode.create({
        code: uniqueCode,
        deviceType: 'smartphone',
        brand: 'PixelBrand',
        deviceModel: 'Model 9',
        ecoCoinsValue: 2500,
        isRegistered: false,
      });

      expect(deviceCode.code).toBe(uniqueCode);
      expect(deviceCode.isRegistered).toBe(false);

      await DeviceCode.findByIdAndDelete(deviceCode._id);
    });

    it('rejects improperly formatted manufacturer codes', async () => {
      await expect(
        DeviceCode.create({
          code: 'INVALID-CODE',
          deviceType: 'smartphone',
          brand: 'Brand',
          deviceModel: 'Model X',
          ecoCoinsValue: 1000,
        })
      ).rejects.toThrow();
    });
  });

  describe('Reward Model', () => {
    it('creates a reward with valid category and positive cost', async () => {
      const reward = await Reward.create({
        title: 'Free Coffee',
        description: 'Eco-friendly cafe voucher',
        costInCoins: 30,
        category: 'discount',
        isActive: true,
      });

      expect(reward._id).toBeDefined();
      expect(reward.category).toBe('discount');
      expect(reward.isActive).toBe(true);

      await Reward.findByIdAndDelete(reward._id);
    });
  });

  describe('Transaction Model', () => {
    it('creates a transaction with type and amount', async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const tx = await Transaction.create({
        userId: testUserId,
        type: 'earn',
        amount: 150,
        description: 'Completed e-waste quiz',
      });

      expect(tx._id).toBeDefined();
      expect(tx.type).toBe('earn');
      expect(tx.amount).toBe(150);

      await Transaction.findByIdAndDelete(tx._id);
    });
  });

  describe('Notification Model', () => {
    it('creates a notification with default isRead false', async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const testDeviceId = new mongoose.Types.ObjectId();
      const notification = await Notification.create({
        userId: testUserId,
        deviceId: testDeviceId,
        deviceName: 'Test Phone',
        message: 'Battery degraded',
        type: 'warning',
      });

      expect(notification._id).toBeDefined();
      expect(notification.isRead).toBe(false);

      await Notification.findByIdAndDelete(notification._id);
    });
  });
});
