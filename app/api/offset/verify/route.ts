import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyOffsetCertificate } from "@/lib/offset_retirement";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const certificateId = req.nextUrl.searchParams.get("certificateId");

    if (!certificateId) {
      return NextResponse.json(
        { error: "certificateId query parameter is required" },
        { status: 400 }
      );
    }

    const result = await verifyOffsetCertificate(certificateId);
    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.reason },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { valid: true, certificate: result.certificate },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to verify certificate." },
      { status: 500 }
    );
  }
}
