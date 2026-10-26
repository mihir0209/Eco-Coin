import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { castJurorVote } from "@/lib/dispute_arbitration";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { disputeId, juror, approve, weight } = body;

    const result = await castJurorVote(
      disputeId,
      juror,
      Boolean(approve),
      weight ? Number(weight) : 1
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
