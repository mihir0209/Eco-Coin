import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import GreenBond from "@/models/GreenBond";
import {
  issueGreenBond,
  processCouponPayout,
  redeemBondPrincipal,
} from "@/lib/green_bond_engine";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await GreenBond.deleteMany({});
});

describe("Dynamic Green Bond Issuance & Automated Coupon Yield Payout Suite", () => {
  it("issues a green bond with mandatory 15% escrow collateral", async () => {
    const bond = await issueGreenBond(
      "gbond-wind-101",
      "nordic_wind_farms",
      "wind",
      100000, // 100,000 ECO principal
      800, // 8.0% annual coupon (800 bps)
      4, // 4 quarterly epochs
      500000 // 500,000 kWh committed
    );

    expect(bond.bondId).toBe("gbond-wind-101");
    expect(bond.principalAmount).toBe(100000);
    expect(bond.escrowCollateral).toBe(15000); // 15% of 100,000
    expect(bond.status).toBe("active");
  });

  it("processes epoch 1 coupon payout with 100% telemetry target fulfillment", async () => {
    await issueGreenBond(
      "gbond-wind-102",
      "nordic_wind_farms",
      "wind",
      100000,
      800,
      4,
      500000
    );

    // Target per epoch: 500,000 / 4 = 125,000 kWh
    // Actual: 130,000 kWh (yield ratio > 1.0)
    const receipt = await processCouponPayout("gbond-wind-102", 130000);

    expect(receipt.epoch).toBe(1);
    expect(receipt.penaltyDeducted).toBe(0);
    // Standard coupon: (100,000 * 0.08) / 4 = 2,000 ECO
    expect(receipt.couponAmountPaid).toBe(2000);
    expect(receipt.status).toBe("active");
  });

  it("slashes escrow collateral and assesses penalties when telemetry drops below 75%", async () => {
    await issueGreenBond(
      "gbond-wind-103",
      "nordic_wind_farms",
      "wind",
      100000,
      800,
      4,
      500000
    );

    // Target: 125,000 kWh. Actual: 60,000 kWh (48% of target -> underperformance penalty!)
    const receipt = await processCouponPayout("gbond-wind-103", 60000);

    expect(receipt.epoch).toBe(1);
    expect(receipt.penaltyDeducted).toBeGreaterThan(0);
    expect(receipt.yieldRatio).toBeLessThan(0.75);

    const updated = await GreenBond.findOne({ bondId: "gbond-wind-103" });
    expect(updated?.escrowCollateral).toBeLessThan(15000);
  });

  it("prevents principal redemption before all epochs mature", async () => {
    await issueGreenBond(
      "gbond-wind-104",
      "nordic_wind_farms",
      "wind",
      100000,
      800,
      4,
      500000
    );

    await expect(redeemBondPrincipal("gbond-wind-104")).rejects.toThrow(
      "Principal cannot be redeemed until bond matures"
    );
  });

  it("reaches maturity upon completing all epochs and allows principal redemption", async () => {
    await issueGreenBond(
      "gbond-wind-105",
      "nordic_wind_farms",
      "wind",
      100000,
      800,
      2, // 2 epochs
      200000
    );

    // Process epoch 1 and epoch 2
    await processCouponPayout("gbond-wind-105", 100000);
    const finalReceipt = await processCouponPayout("gbond-wind-105", 100000);

    expect(finalReceipt.epoch).toBe(2);
    expect(finalReceipt.status).toBe("matured");

    const redemption = await redeemBondPrincipal("gbond-wind-105");
    expect(redemption.redeemed).toBe(100000);
    expect(redemption.status).toBe("matured");
  });

  it("rejects non-positive principal or invalid coupon rates", async () => {
    await expect(
      issueGreenBond("gbond-err", "issuer", "solar", -500, 500, 2, 1000)
    ).rejects.toThrow("Principal amount must be positive");

    await expect(
      issueGreenBond("gbond-err", "issuer", "solar", 1000, 5000, 2, 1000)
    ).rejects.toThrow("Coupon rate bps must be between 1 and 3000");
  });
});
