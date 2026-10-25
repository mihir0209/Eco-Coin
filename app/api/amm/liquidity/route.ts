import { NextRequest, NextResponse } from 'next/server';
import { AmmPoolEngine } from '@/lib/amm_pool';
import connectDB from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { action, poolId, userId, amountA, amountB, lpShares, minLpShares, minAmountA, minAmountB } = body;

    if (!action || !poolId || !userId) {
      return NextResponse.json({ error: 'Missing poolId, userId, or action' }, { status: 400 });
    }

    if (action === 'add') {
      const res = await AmmPoolEngine.addLiquidity({
        poolId,
        userId,
        amountA: Number(amountA),
        amountB: Number(amountB),
        minLpShares: minLpShares ? Number(minLpShares) : 0,
      });
      return NextResponse.json({ success: true, ...res }, { status: 200 });
    } else if (action === 'remove') {
      const res = await AmmPoolEngine.removeLiquidity({
        poolId,
        userId,
        lpShares: Number(lpShares),
        minAmountA: minAmountA ? Number(minAmountA) : 0,
        minAmountB: minAmountB ? Number(minAmountB) : 0,
      });
      return NextResponse.json({ success: true, ...res }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid action; must be 'add' or 'remove'" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Liquidity operation failed' }, { status: 400 });
  }
}
