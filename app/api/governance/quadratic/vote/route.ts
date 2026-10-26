import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { castQuadraticVote } from "@/lib/quadratic_voting";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { proposalId, voterId, credits, tier } = body;

    if (!proposalId || !voterId || credits === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: proposalId, voterId, credits" },
        { status: 400 }
      );
    }

    const receipt = await castQuadraticVote(
      proposalId,
      voterId,
      Number(credits),
      tier !== undefined ? Number(tier) : 2
    );

    return NextResponse.json({ success: true, receipt }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to cast vote" }, { status: 400 });
  }
}
