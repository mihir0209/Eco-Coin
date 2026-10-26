import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { executePoolRebalance } from "@/lib/amm_rebalancer";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { pairSymbol, baseReserve, quoteReserve, targetRatio } = body;

    const result = await executePoolRebalance(
      pairSymbol || "ECO/USDC",
      Number(baseReserve),
      Number(quoteReserve),
      Number(targetRatio)
    );
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
