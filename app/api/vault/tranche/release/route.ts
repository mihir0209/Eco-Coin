import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { releaseVaultTranche } from "@/lib/eco_vault";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { vaultId, trancheNumber, oracleSecretKey, milestoneEvidence } = body;

    if (!vaultId || !trancheNumber || !oracleSecretKey || !milestoneEvidence) {
      return NextResponse.json(
        { error: "Missing required tranche release fields" },
        { status: 400 }
      );
    }

    const vault = await releaseVaultTranche({
      vaultId,
      trancheNumber: Number(trancheNumber),
      oracleSecretKey,
      milestoneEvidence,
    });

    return NextResponse.json(
      { success: true, message: "Tranche funds released successfully.", vault },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to release tranche funds." },
      { status: 400 }
    );
  }
}
