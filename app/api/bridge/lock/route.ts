import { NextRequest, NextResponse } from 'next/server';
import { CarbonLockboxEngine } from '@/lib/carbon_lockbox';
import connectDB from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const lockbox = await CarbonLockboxEngine.lockAndFractionalize(body);
    return NextResponse.json({ success: true, lockbox }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bridge lock operation failed' }, { status: 400 });
  }
}
