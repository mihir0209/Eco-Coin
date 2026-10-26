import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyRetirementCertificate } from "@/lib/offset_retirement";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { certificateId, expectedHash } = body;

    if (!certificateId) {
      return NextResponse.json({ error: "Missing certificateId" }, { status: 400 });
    }

    const result = await verifyRetirementCertificate(certificateId, expectedHash);
    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, certificate: result.certificate }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to verify certificate" }, { status: 400 });
  }
}
