import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createProductPassport } from "@/lib/product_passport";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { passportId, productName, category, ownerId, location, carbonFootprintKg } = body;

    if (!passportId || !productName || !category || !ownerId || !location) {
      return NextResponse.json(
        { error: "Missing required fields: passportId, productName, category, ownerId, location" },
        { status: 400 }
      );
    }

    const passport = await createProductPassport({
      passportId,
      productName,
      category,
      ownerId,
      location,
      carbonFootprintKg: Number(carbonFootprintKg || 0),
    });

    return NextResponse.json(
      { success: true, message: "Digital Product Passport created.", passport },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create passport." },
      { status: 400 }
    );
  }
}
