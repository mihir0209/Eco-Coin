import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { retireCarbonOffset } from "@/lib/offset_retirement";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, beneficiaryName, scope, co2KgRetired, retirementReason } = body;

    if (!userId || !beneficiaryName || !co2KgRetired) {
      return NextResponse.json(
        { error: "Missing required fields: userId, beneficiaryName, co2KgRetired" },
        { status: 400 }
      );
    }

    const cert = await retireCarbonOffset({
      userId,
      beneficiaryName,
      scope,
      co2KgRetired: Number(co2KgRetired),
      retirementReason,
    });

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
