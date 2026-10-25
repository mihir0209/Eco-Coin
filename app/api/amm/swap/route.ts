import { NextRequest, NextResponse } from 'next/server';
import { AmmPoolEngine } from '@/lib/amm_pool';
import connectDB from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { poolId, userId, inputToken, inputAmount, minOutputAmount } = body;

    if (!poolId || !userId || !inputToken || inputAmount == null || minOutputAmount == null) {
      return NextResponse.json({ error: 'Missing required swap fields' }, { status: 400 });
    }

    const result = await AmmPoolEngine.swap({
      poolId,
      userId,
      inputToken,
      inputAmount: Number(inputAmount),
      minOutputAmount: Number(minOutputAmount),
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Swap failed' }, { status: 400 });
  }
}
