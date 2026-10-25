import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createEnergyOrder, cancelEnergyOrder } from "@/lib/microgrid_matching";
import EnergyOrder from "@/models/EnergyOrder";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, side, energyType, unitsKwh, pricePerKwh } = body;

    if (!userId || !side || !energyType || !unitsKwh || !pricePerKwh) {
      return NextResponse.json(
        { error: "Missing required fields: userId, side, energyType, unitsKwh, pricePerKwh" },
        { status: 400 }
      );
    }

    const order = await createEnergyOrder({
      userId,
      side,
      energyType,
      unitsKwh: Number(unitsKwh),
      pricePerKwh: Number(pricePerKwh),
    });

    return NextResponse.json(
      { success: true, message: "Energy order created successfully.", order },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create energy order." },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const side = searchParams.get("side");
    const energyType = searchParams.get("energyType");

    const query: any = { status: { $in: ["open", "partially_filled"] } };
    if (side) query.side = side;
    if (energyType) query.energyType = energyType;

    const orders = await EnergyOrder.find(query).sort({ pricePerKwh: side === "buy" ? -1 : 1 });
    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
