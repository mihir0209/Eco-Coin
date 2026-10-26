import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { delegateCarbonStake } from "@/lib/carbon_staking";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { stakerAddress, stakedAmount, emissionTargetKg } = body;

    const result = await delegateCarbonStake(stakerAddress, Number(stakedAmount), Number(emissionTargetKg));
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
