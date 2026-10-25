import crypto from 'crypto';
import { CarbonLockbox, ICarbonLockbox } from '@/models/CarbonLockbox';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

export interface LockParams {
  lockId: string;
  userId: string;
  creditStandard: 'Verra' | 'GoldStandard' | 'PuroEarth';
  serialNumber: string;
  vintageYear: number;
  totalTonsLocked: number;
  targetChain: string;
  recipientAddress: string;
}

export class CarbonLockboxEngine {
  static computeMerkleProof(
    lockId: string,
    serialNumber: string,
    standard: string,
    tons: number,
    vintage: number
  ): string {
    const leaf = `${lockId}|${serialNumber}|${standard}|${tons}|${vintage}`;
    return crypto.createHash('sha256').update(leaf).digest('hex');
  }

  static async lockAndFractionalize(params: LockParams): Promise<ICarbonLockbox> {
    const {
      lockId,
      userId,
      creditStandard,
      serialNumber,
      vintageYear,
      totalTonsLocked,
      targetChain,
      recipientAddress,
    } = params;

    if (totalTonsLocked <= 0) {
      throw new Error('Total tons locked must be greater than zero');
    }

    const existing = await CarbonLockbox.findOne({ lockId });
    if (existing) {
      throw new Error(`Lockbox item with id '${lockId}' already exists`);
    }

    // 1 Ton = 1,000 Micro-Fractional Carbon Tokens
    const fractionalTokensIssued = Math.floor(totalTonsLocked * 1000);

    const merkleRootHash = this.computeMerkleProof(
      lockId,
      serialNumber,
      creditStandard,
      totalTonsLocked,
      vintageYear
    );

    const lockbox = await CarbonLockbox.create({
      lockId,
      userId,
      creditStandard,
      serialNumber,
      vintageYear,
      totalTonsLocked,
      fractionalTokensIssued,
      targetChain,
      recipientAddress,
      merkleRootHash,
      status: 'locked',
    });

    // Credit user fractional balance
    const user = await User.findById(userId);
    if (user) {
      user.totalEcoCoins += fractionalTokensIssued;
      await user.save();

      await Transaction.create({
        userId: user._id,
        amount: fractionalTokensIssued,
        type: 'earn',
        description: `Bridge Fractionalization: Locked ${totalTonsLocked} tons of ${creditStandard} (${serialNumber})`,
      });
    }

    return lockbox;
  }

  static async unlockAndRedeem(
    lockId: string,
    userId: string,
    fractionalTokensToBurn: number
  ): Promise<{
    redeemedTons: number;
    remainingLockedTons: number;
    lockbox: ICarbonLockbox;
  }> {
    const lockbox = await CarbonLockbox.findOne({ lockId });
    if (!lockbox) {
      throw new Error(`Lockbox '${lockId}' not found`);
    }

    if (lockbox.status !== 'locked') {
      throw new Error(`Lockbox '${lockId}' is already ${lockbox.status}`);
    }

    if (fractionalTokensToBurn <= 0 || fractionalTokensToBurn > lockbox.fractionalTokensIssued) {
      throw new Error('Invalid fractional token burn amount');
    }

    const user = await User.findById(userId);
    if (!user || user.totalEcoCoins < fractionalTokensToBurn) {
      throw new Error('Insufficient user token balance to redeem locked carbon credits');
    }

    const redeemedTons = fractionalTokensToBurn / 1000;
    user.totalEcoCoins -= fractionalTokensToBurn;
    await user.save();

    await Transaction.create({
      userId: user._id,
      amount: fractionalTokensToBurn,
      type: 'redeem',
      description: `Bridge Unlock: Redeemed ${redeemedTons} tons of carbon credit for lockbox ${lockId}`,
    });

    lockbox.fractionalTokensIssued -= fractionalTokensToBurn;
    lockbox.totalTonsLocked -= redeemedTons;

    if (lockbox.fractionalTokensIssued === 0) {
      lockbox.status = 'unlocked';
    }

    await lockbox.save();

    return {
      redeemedTons,
      remainingLockedTons: lockbox.totalTonsLocked,
      lockbox,
    };
  }
}
