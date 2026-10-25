import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createStakePosition } from "@/lib/staking_engine";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, poolId, amount, lockPeriodDays } = body;

    if (!userId || !poolId || !amount || !lockPeriodDays) {
      return NextResponse.json(
        { error: "Missing required fields: userId, poolId, amount, lockPeriodDays" },
        { status: 400 }
      );
    }

    const position = await createStakePosition({
      userId,
      poolId,
      amount: Number(amount),
      lockPeriodDays: Number(lockPeriodDays),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Staking position created successfully.",
        position,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create staking position." },
      { status: 400 }
    );
  }
}
