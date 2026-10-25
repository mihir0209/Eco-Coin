import { describe, it, expect, beforeAll, afterAll } from "vitest";
import connectDB, { disconnectDB } from "@/lib/mongodb";
import User from "@/models/User";
import OffsetCertificate from "@/models/OffsetCertificate";
import Transaction from "@/models/Transaction";
import {
  calculateRequiredCoins,
  retireCarbonOffset,
  verifyOffsetCertificate,
  generateCertificateId,
} from "@/lib/offset_retirement";
import { POST as retireHandler } from "@/app/api/offset/retire/route";
import { GET as verifyHandler } from "@/app/api/offset/verify/route";
import { NextRequest } from "next/server";

describe("Adversarial Carbon Offset Retirement & Certificate Generator Suite", () => {
  beforeAll(async () => {
    await connectDB();
    await User.init();
    await OffsetCertificate.init();
    await Transaction.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("calculates exact coins required based on CO2 kg ratio", () => {
    expect(calculateRequiredCoins(100)).toBe(10);
    expect(calculateRequiredCoins(25)).toBe(2.5);
    expect(calculateRequiredCoins(1)).toBe(0.1);
    expect(() => calculateRequiredCoins(0)).toThrow();
    expect(() => calculateRequiredCoins(-50)).toThrow();
  });

  it("executes verifiable carbon retirement, deducting balance atomically", async () => {
    const user = await User.create({
      name: "Climate Conscious Corp",
      email: `offset_user_${Date.now()}@test.com`,
      password: "securepassword",
      totalEcoCoins: 50,
    });

    const cert = await retireCarbonOffset({
      userId: user._id.toString(),
      beneficiaryName: "Green Logistics GmbH",
      scope: "scope1",
      co2KgRetired: 250, // requires 25.0 EcoCoins
      retirementReason: "Fleet Diesel Offset 2026",
    });

    expect(cert.certificateId).toMatch(/^CERT-CO2-GREENLOG-/);
    expect(cert.ecoCoinsBurned).toBe(25);
    expect(cert.co2KgRetired).toBe(250);
    expect(cert.status).toBe("RETIRED");

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.totalEcoCoins).toBe(25);

    // Verify certificate authenticity
    const verification = await verifyOffsetCertificate(cert.certificateId);
    expect(verification.valid).toBe(true);
    expect(verification.certificate?.beneficiaryName).toBe("Green Logistics GmbH");
  });

  it("adversarial: rejects offset when user has insufficient balance", async () => {
    const poorUser = await User.create({
      name: "Low Balance User",
      email: `poor_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 2,
    });

    await expect(
      retireCarbonOffset({
        userId: poorUser._id.toString(),
        beneficiaryName: "Solar Energy Project",
        co2KgRetired: 500, // requires 50 coins, has 2
      })
    ).rejects.toThrow(/Insufficient Eco-Coin balance/);

    const check = await User.findById(poorUser._id);
    expect(check?.totalEcoCoins).toBe(2);
  });

  it("adversarial: detects forged or tampered verification hash", async () => {
    const user = await User.create({
      name: "Tamper Test User",
      email: `tamper_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 100,
    });

    const cert = await retireCarbonOffset({
      userId: user._id.toString(),
      beneficiaryName: "Authentic Carbon Fund",
      co2KgRetired: 50,
    });

    // Directly tamper with database verification hash to simulate hostile tampering
    await OffsetCertificate.updateOne(
      { certificateId: cert.certificateId },
      { $set: { verificationHash: "deadbeef00000000000000000000000000000000000000000000000000000000" } }
    );

    const verification = await verifyOffsetCertificate(cert.certificateId);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain("hash mismatch");
  });

  it("integrates REST API handlers for retirement and verification", async () => {
    const user = await User.create({
      name: "API Offset User",
      email: `api_offset_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 80,
    });

    const reqPost = new NextRequest("http://localhost:3000/api/offset/retire", {
      method: "POST",
      body: JSON.stringify({
        userId: user._id.toString(),
        beneficiaryName: "Zero Emission Flights",
        scope: "scope3",
        co2KgRetired: 150,
        retirementReason: "Business Flight London-Tokyo",
      }),
    });

    const resPost = await retireHandler(reqPost);
    expect(resPost.status).toBe(201);
    const bodyPost = await resPost.json();
    expect(bodyPost.success).toBe(true);
    const certId = bodyPost.certificate.certificateId;

    const reqGet = new NextRequest(`http://localhost:3000/api/offset/verify?certificateId=${certId}`);
    const resGet = await verifyHandler(reqGet);
    expect(resGet.status).toBe(200);
    const bodyGet = await resGet.json();
    expect(bodyGet.valid).toBe(true);
    expect(bodyGet.certificate.certificateId).toBe(certId);
  });
});
