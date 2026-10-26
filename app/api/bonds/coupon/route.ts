import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { processCouponPayout } from "@/lib/green_bond_engine";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { bondId, epochTelemetryYieldKwh } = body;

    if (!bondId || epochTelemetryYieldKwh === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: bondId, epochTelemetryYieldKwh" },
        { status: 400 }
      );
    }

    const receipt = await processCouponPayout(bondId, Number(epochTelemetryYieldKwh));
    return NextResponse.json({ success: true, receipt }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process coupon payout" }, { status: 400 });
  }
}
