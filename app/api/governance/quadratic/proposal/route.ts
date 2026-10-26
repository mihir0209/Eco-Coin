import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createQuadraticProposal } from "@/lib/quadratic_voting";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { proposalId, title, description, creator, durationHours } = body;

    if (!proposalId || !title || !description || !creator) {
      return NextResponse.json(
        { error: "Missing required fields: proposalId, title, description, creator" },
        { status: 400 }
      );
    }

    const proposal = await createQuadraticProposal(
      proposalId,
      title,
      description,
      creator,
      durationHours || 72
    );

    return NextResponse.json({ success: true, proposal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create proposal" }, { status: 400 });
  }
}
