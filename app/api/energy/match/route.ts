import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { matchMicrogridOrders } from "@/lib/microgrid_matching";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const energyType = body.energyType;

    const result = await matchMicrogridOrders(energyType);
    return NextResponse.json({
      success: true,
      message: `Matching engine cycle complete. ${result.tradesExecuted} trades executed.`,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute matching engine cycle." },
      { status: 400 }
    );
  }
}
