import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import '@/models/Device';
import '@/models/Reward';

// GET /api/transactions - Get transactions by userId
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let query: any = { userId };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('deviceId', 'name type')
      .populate('rewardId', 'title');

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const transaction = await Transaction.create(body);

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
