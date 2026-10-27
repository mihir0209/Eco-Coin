import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computePositionHealth,
  calculateLiquidationSeizure,
  executeLiquidation,
} from "../../lib/carbon_collateral_engine";
import CarbonCollateralPosition from "../../models/CarbonCollateralPosition";

vi.mock("../../models/CarbonCollateralPosition", () => {
  const store = new Map<string, any>();
  return {
    default: {
      findOne: vi.fn(async (q: any) => {
        if (q.positionId && store.has(q.positionId)) {
          const doc = store.get(q.positionId);
          return {
            ...doc,
            save: vi.fn(async function () {
              store.set(this.positionId, { ...this });
              return this;
            }),
          };
        }
        return null;
      }),
      create: vi.fn(async (doc: any) => {
        const item = { ...doc, _id: "pos_" + Math.random().toString(36).substring(7) };
        store.set(doc.positionId, item);
        return item;
      }),
      _set: (id: string, doc: any) => store.set(id, doc),
      _clear: () => store.clear(),
    },
  };
});

describe("Carbon Collateral Liquidation Engine", () => {
  beforeEach(() => {
    (CarbonCollateralPosition as any)._clear();
    vi.clearAllMocks();
  });

  it("accurately computes position health factor and collateral ratios", () => {
    // 1500 USDC collateral ($1.00), 1000 Carbon debt ($1.00) -> 150% ratio. Min ratio 120%
    const healthy = computePositionHealth(1500, 1.0, 1000, 1.0, 120);
    expect(healthy.collateralRatioPct).toBe(150);
    expect(healthy.healthFactor).toBe(1.25);
    expect(healthy.isLiquidatable).toBe(false);

    // Carbon price spikes to $1.50 -> Debt value = $1500 -> Collateral ratio = 100% -> HF = 0.8333 < 1.0
    const undercollateralized = computePositionHealth(1500, 1.0, 1000, 1.5, 120);
    expect(undercollateralized.collateralRatioPct).toBe(100);
    expect(undercollateralized.healthFactor).toBeLessThan(1.0);
    expect(undercollateralized.isLiquidatable).toBe(true);

    // Zero debt is always solvent
    const zeroDebt = computePositionHealth(1000, 1.0, 0, 1.0, 120);
    expect(zeroDebt.isLiquidatable).toBe(false);
  });

  it("calculates liquidation seizure with incentive bonus penalty", () => {
    // Liquidate 500 Carbon debt ($2.00/unit) = $1000 debt value.
    // Collateral is USDC ($1.00). Liquidation bonus = 8%.
    // Seized collateral = $1000 * 1.08 / $1.00 = 1080 USDC.
    const { totalCollateralSeized, penaltyBonusCollateral } = calculateLiquidationSeizure(500, 1.0, 2.0, 8);
    expect(totalCollateralSeized).toBe(1080);
    expect(penaltyBonusCollateral).toBe(80);
  });

  it("denies liquidation for solvent healthy positions", async () => {
    (CarbonCollateralPosition as any)._set("pos-solvent", {
      positionId: "pos-solvent",
      borrowerAddress: "0xBorrower01",
      collateralAmount: 3000,
      debtAmount: 1000,
      collateralPriceUsd: 1.0,
      carbonPriceUsd: 1.0,
      minCollateralRatioPct: 120,
      liquidationPenaltyPct: 8,
      status: "HEALTHY",
    });

    await expect(
      executeLiquidation("pos-solvent", "0xLiquidatorBot", 500)
    ).rejects.toThrow("is solvent");
  });

  it("executes partial liquidation and seizes collateral with penalty", async () => {
    // Undercollateralized position: 1000 USDC collateral, 1000 Carbon debt at $1.20/unit (Ratio: 83.33% < 120%)
    (CarbonCollateralPosition as any)._set("pos-under", {
      positionId: "pos-under",
      borrowerAddress: "0xBorrower02",
      collateralAmount: 1000,
      debtAmount: 1000,
      collateralPriceUsd: 1.0,
      carbonPriceUsd: 1.2,
      minCollateralRatioPct: 120,
      liquidationPenaltyPct: 8,
      status: "UNDERCOLLATERALIZED",
    });

    // Liquidator covers 400 debt units ($480 value * 1.08 = 518.4 USDC seized)
    const result = await executeLiquidation("pos-under", "0xLiquidatorBot", 400);

    expect(result.debtRepaid).toBe(400);
    expect(result.collateralSeized).toBe(518.4);
    expect(result.penaltyCollateralEarned).toBeCloseTo(38.4, 2);
    expect(result.remainingDebt).toBe(600);
    expect(result.remainingCollateral).toBeCloseTo(481.6, 2);
  });

  it("handles full liquidation closing out position", async () => {
    (CarbonCollateralPosition as any)._set("pos-full", {
      positionId: "pos-full",
      borrowerAddress: "0xBorrower03",
      collateralAmount: 550,
      debtAmount: 500,
      collateralPriceUsd: 1.0,
      carbonPriceUsd: 1.0,
      minCollateralRatioPct: 120,
      liquidationPenaltyPct: 8,
      status: "UNDERCOLLATERALIZED",
    });

    // Repay entire 500 debt -> seized = 500 * 1.08 = 540 USDC
    const result = await executeLiquidation("pos-full", "0xLiquidatorBot", 500);
    expect(result.debtRepaid).toBe(500);
    expect(result.remainingDebt).toBe(0);

    // Re-attempting liquidation on already closed position throws
    await expect(
      executeLiquidation("pos-full", "0xLiquidatorBot", 100)
    ).rejects.toThrow("already fully liquidated");
  });
});
