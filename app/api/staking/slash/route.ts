import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { auditAndSettleStake } from "@/lib/carbon_staking";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { stakerAddress, actualEmissionsKg, auditSecretKey } = body;

    const result = await auditAndSettleStake(
      stakerAddress,
      Number(actualEmissionsKg),
      auditSecretKey || "default_audit_key_secret"
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
