import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Reward from '@/models/Reward';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

// POST /api/rewards/redeem - Redeem a reward with atomic double-spend prevention & receipts
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { rewardId, userId, idempotencyKey } = body;

    const effectiveIdempotencyKey =
      idempotencyKey ||
      request.headers.get('x-idempotency-key') ||
      request.headers.get('idempotency-key');

    if (!rewardId || !userId) {
      return NextResponse.json(
        { error: 'Reward ID and User ID are required' },
        { status: 400 }
      );
    }

    // 1. Idempotency Check: return existing settled transaction if already claimed
    if (effectiveIdempotencyKey) {
      const existingTx = await Transaction.findOne({
        idempotencyKey: effectiveIdempotencyKey,
        userId,
      }).populate('rewardId');

      if (existingTx) {
        return NextResponse.json({
          success: true,
          idempotent: true,
          data: {
            transactionId: existingTx._id,
            reward: existingTx.rewardId,
            coinsDeducted: Math.abs(existingTx.amount),
            receiptHash: existingTx.receiptHash,
            settledAt: existingTx.timestamp,
          },
        });
      }
    }

    // 2. Validate Reward existence and status
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    if (!reward.isActive) {
      return NextResponse.json(
        { error: 'This reward is no longer active' },
        { status: 400 }
      );
    }

    const cost = reward.costInCoins;
    if (typeof cost !== 'number' || cost < 0) {
      return NextResponse.json({ error: 'Invalid reward cost' }, { status: 400 });
    }

    // 3. ATOMIC CONDITIONAL BALANCE DECREMENT
    // Prevents concurrent race conditions / double-spending:
    // Only decrements IF totalEcoCoins >= cost atomically at DB level!
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        totalEcoCoins: { $gte: cost },
      },
      {
        $inc: { totalEcoCoins: -cost },
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Insufficient Eco-Coins' },
        { status: 400 }
      );
    }

    // 4. Cryptographic Settlement Receipt Generation
    const settledAt = new Date();
    const payload = `${userId}:${rewardId}:${cost}:${settledAt.toISOString()}:${effectiveIdempotencyKey || 'none'}`;
    const receiptHash = crypto
      .createHmac('sha256', process.env.ATTESTATION_SECRET || 'eco-coin-settlement-secret')
      .update(payload)
      .digest('hex');

    // 5. Create Transaction Record
    try {
      const tx = await Transaction.create({
        userId,
        type: 'redeem',
        amount: -cost,
        description: `Redeemed: ${reward.title}`,
        rewardId,
        idempotencyKey: effectiveIdempotencyKey,
        receiptHash,
        status: 'settled',
        timestamp: settledAt,
      });

      return NextResponse.json({
        success: true,
        data: {
          transactionId: tx._id,
          reward,
          coinsDeducted: cost,
          newBalance: updatedUser.totalEcoCoins,
          receiptHash,
          settledAt,
        },
      });
    } catch (txErr: any) {
      // If duplicate idempotency key raced simultaneously, rollback balance decrement
      if (txErr.code === 11000 && effectiveIdempotencyKey) {
        await User.findByIdAndUpdate(userId, { $inc: { totalEcoCoins: cost } });
        const existingTx = await Transaction.findOne({
          idempotencyKey: effectiveIdempotencyKey,
        }).populate('rewardId');
        return NextResponse.json({
          success: true,
          idempotent: true,
          data: {
            transactionId: existingTx?._id,
            reward: existingTx?.rewardId || reward,
            coinsDeducted: cost,
            receiptHash: existingTx?.receiptHash,
            settledAt: existingTx?.timestamp,
          },
        });
      }
      throw txErr;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
