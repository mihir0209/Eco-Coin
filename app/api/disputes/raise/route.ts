import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { raiseEnvironmentalDispute } from "@/lib/dispute_arbitration";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { challenger, targetEntity, claimType, evidenceData, challengerBond } = body;

    const result = await raiseEnvironmentalDispute(
      challenger,
      targetEntity,
      claimType,
      evidenceData,
      Number(challengerBond)
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
