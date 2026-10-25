import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductPassport, { IPassportEvent } from "@/models/ProductPassport";
import { generateMerkleProof, verifyMerkleProof } from "@/lib/product_passport";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { passportId, eventIndex } = body;

    if (!passportId || eventIndex === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: passportId, eventIndex" },
        { status: 400 }
      );
    }

    const passport = await ProductPassport.findOne({ passportId });
    if (!passport) {
      return NextResponse.json({ error: "Passport not found" }, { status: 404 });
    }

    const leaves = passport.events.map((e: IPassportEvent) => e.leafHash);
    const idx = Number(eventIndex);
    if (idx < 0 || idx >= leaves.length) {
      return NextResponse.json({ error: "Invalid eventIndex" }, { status: 400 });
    }

    const targetLeaf = leaves[idx];
    const proof = generateMerkleProof(leaves, idx);
    const isValid = verifyMerkleProof(targetLeaf, proof, passport.merkleRoot, idx);

    return NextResponse.json({
      success: true,
      passportId,
      merkleRoot: passport.merkleRoot,
      targetLeaf,
      proof,
      verified: isValid,
      event: passport.events[idx],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 400 }
    );
  }
}
