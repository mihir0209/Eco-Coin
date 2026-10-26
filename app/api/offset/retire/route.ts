import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { mintRetirementCertificate } from "@/lib/offset_retirement";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { certificateId, userId, beneficiaryName, tonsRetired, creditStandard, retirementReason } = body;

    if (!certificateId || !userId || !beneficiaryName || !tonsRetired) {
      return NextResponse.json(
        { error: "Missing required fields: certificateId, userId, beneficiaryName, tonsRetired" },
        { status: 400 }
      );
    }

    const cert = await mintRetirementCertificate(
      certificateId,
      userId,
      beneficiaryName,
      Number(tonsRetired),
      creditStandard || "VERRA",
      retirementReason || "Voluntary offset"
    );

    return NextResponse.json(
      { success: true, message: "Carbon offset retired successfully.", certificate: cert },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retire carbon offset." },
      { status: 400 }
    );
  }
}
