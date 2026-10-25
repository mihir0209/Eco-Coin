import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { generateAndSaveCarbonTaxAudit } from "@/lib/carbon_tax_engine";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, organizationName, reportingYear, jurisdiction, grossScope1Kg, grossScope2Kg, grossScope3Kg, offsetsToApplyKg } = body;

    if (!userId || !organizationName || !reportingYear || !jurisdiction) {
      return NextResponse.json(
        { error: "Missing required fields: userId, organizationName, reportingYear, jurisdiction" },
        { status: 400 }
      );
    }

    const audit = await generateAndSaveCarbonTaxAudit({
      userId,
      organizationName,
      reportingYear: Number(reportingYear),
      jurisdiction,
      grossScope1Kg: Number(grossScope1Kg || 0),
      grossScope2Kg: Number(grossScope2Kg || 0),
      grossScope3Kg: Number(grossScope3Kg || 0),
      offsetsToApplyKg: offsetsToApplyKg !== undefined ? Number(offsetsToApplyKg) : undefined,
    });

    return NextResponse.json(
      { success: true, message: "Carbon tax audit completed.", audit },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate carbon tax." },
      { status: 400 }
    );
  }
}
