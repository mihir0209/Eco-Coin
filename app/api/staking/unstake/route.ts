import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { unstakePosition } from "@/lib/staking_engine";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { positionId, userId, forceEarly } = body;

    if (!positionId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: positionId, userId" },
        { status: 400 }
      );
    }

    const result = await unstakePosition({
      positionId,
      userId,
      forceEarly: Boolean(forceEarly),
    });

    return NextResponse.json(
      {
        success: true,
        message: result.penalty > 0
          ? "Position unstaked early with penalty applied."
          : "Position matured and unstaked successfully with carbon yield rewards.",
        ...result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to unstake position." },
      { status: 400 }
    );
  }
}
