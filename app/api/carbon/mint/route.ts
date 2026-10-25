import { NextRequest, NextResponse } from 'next/server';
import { verifyAndMintCarbonCredits } from '@/lib/carbon_verifier';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, deviceId, activityType, unitsClaimed } = body;

    if (!userId || !deviceId || !activityType || unitsClaimed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, deviceId, activityType, unitsClaimed' },
        { status: 400 }
      );
    }

    const result = await verifyAndMintCarbonCredits({
      userId,
      deviceId,
      activityType,
      unitsClaimed: Number(unitsClaimed),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      co2GramsAvoided: result.co2GramsAvoided,
      coinsMinted: result.coinsMinted,
      newTotalBalance: result.newTotalBalance,
      attestationHash: result.attestationHash,
    });
  } catch (error: any) {
    console.error('Carbon minting error:', error);
    return NextResponse.json(
      { error: 'Internal server error during carbon credit minting' },
      { status: 500 }
    );
  }
}
