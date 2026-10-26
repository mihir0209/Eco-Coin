import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { issueGreenBond } from "@/lib/green_bond_engine";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { bondId, issuer, projectType, principalAmount, couponRateBps, totalEpochs, committedYieldKwh } = body;

    if (!bondId || !issuer || !principalAmount || !couponRateBps || !totalEpochs || !committedYieldKwh) {
      return NextResponse.json(
        { error: "Missing required green bond issuance parameters" },
        { status: 400 }
      );
    }

    const bond = await issueGreenBond(
      bondId,
      issuer,
      projectType || "solar",
      Number(principalAmount),
      Number(couponRateBps),
      Number(totalEpochs),
      Number(committedYieldKwh)
    );

    return NextResponse.json({ success: true, bond }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to issue green bond" }, { status: 400 });
  }
}
