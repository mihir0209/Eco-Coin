import { describe, it, expect, beforeAll, afterAll } from "vitest";
import connectDB, { disconnectDB } from "@/lib/mongodb";
import User from "@/models/User";
import ProductPassport, { IPassportEvent } from "@/models/ProductPassport";
import Transaction from "@/models/Transaction";
import {
  createProductPassport,
  appendPassportStage,
  generateMerkleProof,
  verifyMerkleProof,
} from "@/lib/product_passport";
import { POST as registerHandler } from "@/app/api/passport/register/route";
import { POST as verifyHandler } from "@/app/api/passport/verify/route";
import { NextRequest } from "next/server";

describe("Adversarial Digital Product Passport & Merkle Provenance Suite", () => {
  beforeAll(async () => {
    await connectDB();
    await User.init();
    await ProductPassport.init();
    await Transaction.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("builds verifiable cryptographic Merkle tree across product lifecycle stages", async () => {
    const owner = await User.create({
      name: "Circular Tech Producer",
      email: `passport_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 100,
    });

    const passportId = `DPP-BATTERY-${Date.now()}`;
    const passport = await createProductPassport({
      passportId,
      productName: "Li-Ion EV Battery Pack 75kWh",
      category: "battery",
      ownerId: owner._id.toString(),
      location: "Giga Berlin, Germany",
      carbonFootprintKg: 1250,
    });

    expect(passport.events.length).toBe(1);
    expect(passport.events[0].stage).toBe("origin");

    // Append lifecycle stages
    await appendPassportStage({
      passportId,
      stage: "manufacturing",
      location: "Wolfsburg Cell Assembly, Germany",
      actorId: "actor_manuf_01",
    });

    await appendPassportStage({
      passportId,
      stage: "distribution",
      location: "Rotterdam Logistics Port, Netherlands",
      actorId: "actor_dist_02",
    });

    const updated = await appendPassportStage({
      passportId,
      stage: "refurbishing",
      location: "Antwerp Circular Hub, Belgium",
      actorId: "actor_refurb_03",
    });

    expect(updated.events.length).toBe(4);

    // Verify Merkle Inclusion Proof for Manufacturing Event (index 1)
    const leaves = updated.events.map((e: IPassportEvent) => e.leafHash);
    const targetIndex = 1;
    const targetLeaf = leaves[targetIndex];
    const proof = generateMerkleProof(leaves, targetIndex);

    const isValid = verifyMerkleProof(targetLeaf, proof, updated.merkleRoot, targetIndex);
    expect(isValid).toBe(true);

    // Adversarial: altered leaf must fail verification
    const forgedLeaf = "0000000000000000000000000000000000000000000000000000000000000000";
    const isForgedValid = verifyMerkleProof(forgedLeaf, proof, updated.merkleRoot, targetIndex);
    expect(isForgedValid).toBe(false);
  });

  it("finalizes product lifecycle upon recycling and credits circular economy reward", async () => {
    const recycler = await User.create({
      name: "Recycling Facility",
      email: `recycler_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 50,
    });

    const passportId = `DPP-ELECTRONIC-${Date.now()}`;
    await createProductPassport({
      passportId,
      productName: "Refurbished Laptop Core i7",
      category: "electronics",
      ownerId: recycler._id.toString(),
      location: "Munich, Germany",
      carbonFootprintKg: 85,
    });

    // Recycle product
    const recycledPassport = await appendPassportStage({
      passportId,
      stage: "recycled",
      location: "Hamburg Metals Reclamation",
      actorId: "actor_recycle_99",
    });

    expect(recycledPassport.isRecycled).toBe(true);

    // Owner receives 50 EcoCoins
    const userAfter = await User.findById(recycler._id);
    expect(userAfter?.totalEcoCoins).toBe(50 + 50);

    // Attempting further stage additions should be rejected
    await expect(
      appendPassportStage({
        passportId,
        stage: "refurbishing",
        location: "Invalid Hub",
        actorId: "actor_bad",
      })
    ).rejects.toThrow(/already finalized as recycled/);
  });

  it("handles HTTP API routes for DPP registration and cryptographic proof verification", async () => {
    const apiOwner = await User.create({
      name: "API DPP Owner",
      email: `api_dpp_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 200,
    });

    const passportId = `DPP-API-${Date.now()}`;

    // Register passport via HTTP route
    const regReq = new NextRequest("http://localhost:3000/api/passport/register", {
      method: "POST",
      body: JSON.stringify({
        passportId,
        productName: "Recycled Textile Jacket",
        category: "textile",
        ownerId: apiOwner._id.toString(),
        location: "Porto, Portugal",
        carbonFootprintKg: 12,
      }),
    });

    const regRes = await registerHandler(regReq);
    expect(regRes.status).toBe(201);
    const regJson = await regRes.json();
    expect(regJson.success).toBe(true);
    expect(regJson.passport.passportId).toBe(passportId);

    // Verify proof via HTTP route
    const verifyReq = new NextRequest("http://localhost:3000/api/passport/verify", {
      method: "POST",
      body: JSON.stringify({
        passportId,
        eventIndex: 0,
      }),
    });

    const verifyRes = await verifyHandler(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.success).toBe(true);
    expect(verifyJson.verified).toBe(true);
    expect(verifyJson.event.stage).toBe("origin");
  });
});
