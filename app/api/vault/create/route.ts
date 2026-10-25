import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createEcoVault } from "@/lib/eco_vault";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { vaultId, creatorId, projectName, targetFundingEcoCoins, yieldRateApy, tranches } = body;

    if (!vaultId || !creatorId || !projectName || !targetFundingEcoCoins || !yieldRateApy || !tranches) {
      return NextResponse.json(
        { error: "Missing required vault parameters" },
        { status: 400 }
      );
    }

    const vault = await createEcoVault({
      vaultId,
      creatorId,
      projectName,
      targetFundingEcoCoins: Number(targetFundingEcoCoins),
      yieldRateApy: Number(yieldRateApy),
      tranches,
    });

    return NextResponse.json(
      { success: true, message: "EcoVault created successfully.", vault },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create EcoVault." },
      { status: 400 }
    );
  }
}
