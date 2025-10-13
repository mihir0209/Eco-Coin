import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Reward from '@/models/Reward';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

// POST /api/rewards/redeem - Redeem a reward
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { rewardId, userId } = body;

    if (!rewardId || !userId) {
      return NextResponse.json(
        { error: 'Reward ID and User ID are required' },
        { status: 400 }
      );
    }

    // Find the reward
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

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has enough coins
    if (user.totalEcoCoins < reward.costInCoins) {
      return NextResponse.json(
        { error: 'Insufficient Eco-Coins' },
        { status: 400 }
      );
    }

    // Deduct coins from user
    user.totalEcoCoins -= reward.costInCoins;
    await user.save();

    // Create transaction record
    await Transaction.create({
      userId,
      type: 'redeem',
      amount: -reward.costInCoins,
      description: `Redeemed: ${reward.title}`,
      rewardId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        reward,
        coinsDeducted: reward.costInCoins,
        newBalance: user.totalEcoCoins,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
