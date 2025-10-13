import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Device from '@/models/Device';
import Transaction from '@/models/Transaction';
import Reward from '@/models/Reward';

// GET /api/dashboard - Get dashboard statistics for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get devices
    const devices = await Device.find({ userId, isRecycled: false });
    const recycledDevices = await Device.find({ userId, isRecycled: true });

    // Get recent transactions (without populate to avoid model registration issues)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10);

    // Calculate this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthEarnings = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          type: 'earn',
          timestamp: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const thisMonthCoins = thisMonthEarnings[0]?.total || 0;

    // Calculate last month's earnings
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const lastMonthEarnings = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          type: 'earn',
          timestamp: { $gte: startOfLastMonth, $lt: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const lastMonthCoins = lastMonthEarnings[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          totalEcoCoins: user.totalEcoCoins,
          devicesOwned: user.devicesOwned,
          devicesRecycled: user.devicesRecycled,
          co2Saved: user.co2Saved,
        },
        devices,
        recycledDevices,
        recentTransactions,
        earnings: {
          thisMonth: thisMonthCoins,
          lastMonth: lastMonthCoins,
          allTime: user.totalEcoCoins,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
