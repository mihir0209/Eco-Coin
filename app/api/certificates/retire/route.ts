import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { mintRetirementCertificate } from "@/lib/offset_retirement";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { certificateId, owner, beneficiary, tonsRetired, creditStandard, retirementReason } = body;

    if (!certificateId || !owner || !beneficiary || tonsRetired === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: certificateId, owner, beneficiary, tonsRetired" },
        { status: 400 }
      );
    }

    const cert = await mintRetirementCertificate(
      certificateId,
      owner,
      beneficiary,
      Number(tonsRetired),
      creditStandard || "VERRA",
      retirementReason || "Voluntary Corporate Carbon Neutrality"
    );

    return NextResponse.json({ success: true, certificate: cert }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to mint certificate" }, { status: 400 });
  }
}
