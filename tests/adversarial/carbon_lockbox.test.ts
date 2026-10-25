import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CarbonLockbox } from '@/models/CarbonLockbox';
import User from '@/models/User';
import { CarbonLockboxEngine } from '@/lib/carbon_lockbox';

let mongoServer: MongoMemoryServer;

beforeEach(async () => {
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
  await CarbonLockbox.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Carbon Credit Fractionalization & Cross-Chain Bridge Lockbox', () => {
  it('locks verified carbon credit tons and mints exact micro-fractional tokens', async () => {
    const user = await User.create({
      name: 'Forestry Enterprise',
      email: 'forestry@example.com',
      password: 'password123',
      totalEcoCoins: 0,
    });

    const lockbox = await CarbonLockboxEngine.lockAndFractionalize({
      lockId: 'lock-vcs-8801',
      userId: user._id.toString(),
      creditStandard: 'Verra',
      serialNumber: 'VCS-2024-REDD-09214',
      vintageYear: 2024,
      totalTonsLocked: 15.5,
      targetChain: 'Polygon',
      recipientAddress: '0x71C...982F',
    });

    expect(lockbox.status).toBe('locked');
    expect(lockbox.totalTonsLocked).toBe(15.5);
    expect(lockbox.fractionalTokensIssued).toBe(15500); // 15.5 * 1000
    expect(lockbox.merkleRootHash).toHaveLength(64);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.totalEcoCoins).toBe(15500);
  });

  it('partially redeems and burns fractional tokens to unlock carbon credit tons', async () => {
    const user = await User.create({
      name: 'ESG Fund',
      email: 'esg@example.com',
      password: 'password123',
      totalEcoCoins: 0,
    });

    await CarbonLockboxEngine.lockAndFractionalize({
      lockId: 'lock-gold-4402',
      userId: user._id.toString(),
      creditStandard: 'GoldStandard',
      serialNumber: 'GS-WIND-88301',
      vintageYear: 2023,
      totalTonsLocked: 10,
      targetChain: 'Ethereum',
      recipientAddress: '0x123...456',
    });

    // Redeem 4,000 tokens (4 tons)
    const redeemRes = await CarbonLockboxEngine.unlockAndRedeem('lock-gold-4402', user._id.toString(), 4000);

    expect(redeemRes.redeemedTons).toBe(4);
    expect(redeemRes.remainingLockedTons).toBe(6);
    expect(redeemRes.lockbox.status).toBe('locked');

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.totalEcoCoins).toBe(6000);
  });

  it('rejects duplicate lockId registration', async () => {
    const user = await User.create({
      name: 'Trader',
      email: 'trader@example.com',
      password: 'password123',
      totalEcoCoins: 0,
    });

    await CarbonLockboxEngine.lockAndFractionalize({
      lockId: 'lock-dup-01',
      userId: user._id.toString(),
      creditStandard: 'PuroEarth',
      serialNumber: 'PURO-BIO-001',
      vintageYear: 2024,
      totalTonsLocked: 5,
      targetChain: 'Solana',
      recipientAddress: 'SolAddress123',
    });

    await expect(
      CarbonLockboxEngine.lockAndFractionalize({
        lockId: 'lock-dup-01',
        userId: user._id.toString(),
        creditStandard: 'PuroEarth',
        serialNumber: 'PURO-BIO-001',
        vintageYear: 2024,
        totalTonsLocked: 5,
        targetChain: 'Solana',
        recipientAddress: 'SolAddress123',
      })
    ).rejects.toThrow(/already exists/);
  });
});
