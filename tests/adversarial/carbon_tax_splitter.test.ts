import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateCarbonTaxSplits,
  executeCarbonTaxSettlement,
  SplitterInput,
} from "../../lib/carbon_tax_splitter";
import CarbonTaxSplitter from "../../models/CarbonTaxSplitter";

vi.mock("../../models/CarbonTaxSplitter", () => {
  const mockDb = new Map<string, any>();
  return {
    default: {
      findOne: vi.fn(async (query: any) => {
        for (const item of mockDb.values()) {
          if (query.$or) {
            for (const cond of query.$or) {
              if (cond.agreementId && item.agreementId === cond.agreementId) return item;
              if (cond.settlementNonce && item.settlementNonce === cond.settlementNonce) return item;
            }
          }
        }
        return null;
      }),
      create: vi.fn(async (doc: any) => {
        const saved = { ...doc, _id: "mock_id_" + Math.random().toString(36).substring(7) };
        mockDb.set(doc.agreementId, saved);
        return saved;
      }),
      _clear: () => mockDb.clear(),
    },
  };
});

describe("Scope-3 Supply Chain Carbon Tax Splitter & Settlement Router", () => {
  beforeEach(() => {
    (CarbonTaxSplitter as any)._clear();
    vi.clearAllMocks();
  });

  const baseInput: SplitterInput = {
    agreementId: "AGR-SCOPE3-2026-001",
    payerEntity: "Global Logistics Corp",
    totalGrossTokens: 100000,
    cbamTaxRate: 0.10, // 10% CBAM tax
    settlementNonce: "nonce-sec-999888-xyz",
    vendorSplits: [
      {
        vendorId: "VEND-TIER1-01",
        vendorName: "Steel Mill Corp",
        splitPercentage: 50.0,
        withholdingTaxRate: 0.05,
      },
      {
        vendorId: "VEND-TIER2-02",
        vendorName: "Maritime Hauler Ltd",
        splitPercentage: 30.0,
        withholdingTaxRate: 0.10,
      },
      {
        vendorId: "VEND-TIER3-03",
        vendorName: "Last-Mile EV Fleet",
        splitPercentage: 20.0,
        withholdingTaxRate: 0.0,
      },
    ],
  };

  it("accurately computes CBAM and statutory vendor tax withholdings", () => {
    const res = calculateCarbonTaxSplits(baseInput);

    // Total gross: 100,000
    // CBAM (10%): 10,000. Distributable pool: 90,000
    expect(res.totalGrossTokens).toBe(100000);
    expect(res.cbamTaxWithheld).toBe(10000);

    // Vendor 1: 50% of 90k = 45k. Withholding 5% = 2,250. Net = 42,750
    const v1 = res.calculatedSplits.find((v) => v.vendorId === "VEND-TIER1-01");
    expect(v1?.allocatedNetTokens).toBe(42750);
    expect(v1?.withheldTaxTokens).toBe(2250);

    // Vendor 2: 30% of 90k = 27k. Withholding 10% = 2,700. Net = 24,300
    const v2 = res.calculatedSplits.find((v) => v.vendorId === "VEND-TIER2-02");
    expect(v2?.allocatedNetTokens).toBe(24300);
    expect(v2?.withheldTaxTokens).toBe(2700);

    // Vendor 3: 20% of 90k = 18k. Withholding 0% = 0. Net = 18,000
    const v3 = res.calculatedSplits.find((v) => v.vendorId === "VEND-TIER3-03");
    expect(v3?.allocatedNetTokens).toBe(18000);
    expect(v3?.withheldTaxTokens).toBe(0);

    // Total withholding: 10,000 (CBAM) + 2,250 + 2,700 + 0 = 14,950
    expect(res.totalTaxWithheld).toBe(14950);
    // Total net disbursed: 42,750 + 24,300 + 18,000 = 85,050
    expect(res.totalNetDisbursed).toBe(85050);
    // Invariant: net + total tax == gross
    expect(res.totalNetDisbursed + res.totalTaxWithheld).toBe(res.totalGrossTokens);
  });

  it("handles zero tax rates cleanly", () => {
    const input: SplitterInput = {
      ...baseInput,
      cbamTaxRate: 0.0,
      vendorSplits: [
        {
          vendorId: "VEND-01",
          vendorName: "Direct Supplier",
          splitPercentage: 100.0,
          withholdingTaxRate: 0.0,
        },
      ],
    };

    const res = calculateCarbonTaxSplits(input);
    expect(res.cbamTaxWithheld).toBe(0);
    expect(res.totalTaxWithheld).toBe(0);
    expect(res.totalNetDisbursed).toBe(100000);
    expect(res.calculatedSplits[0].allocatedNetTokens).toBe(100000);
  });

  it("rejects non-positive total gross tokens", () => {
    expect(() =>
      calculateCarbonTaxSplits({ ...baseInput, totalGrossTokens: 0 })
    ).toThrow("Total gross tokens must be a positive finite number");

    expect(() =>
      calculateCarbonTaxSplits({ ...baseInput, totalGrossTokens: -500 })
    ).toThrow("Total gross tokens must be a positive finite number");
  });

  it("rejects invalid CBAM tax rates", () => {
    expect(() =>
      calculateCarbonTaxSplits({ ...baseInput, cbamTaxRate: -0.05 })
    ).toThrow("CBAM tax rate must be between 0.0 and 1.0");

    expect(() =>
      calculateCarbonTaxSplits({ ...baseInput, cbamTaxRate: 1.5 })
    ).toThrow("CBAM tax rate must be between 0.0 and 1.0");
  });

  it("rejects vendor split allocations that do not sum to 100%", () => {
    const badInput: SplitterInput = {
      ...baseInput,
      vendorSplits: [
        {
          vendorId: "V1",
          vendorName: "V1",
          splitPercentage: 40.0,
          withholdingTaxRate: 0.05,
        },
        {
          vendorId: "V2",
          vendorName: "V2",
          splitPercentage: 50.0,
          withholdingTaxRate: 0.05,
        },
      ],
    };

    expect(() => calculateCarbonTaxSplits(badInput)).toThrow("Vendor split percentages must sum exactly to 100%");
  });

  it("rejects empty vendor split list", () => {
    expect(() =>
      calculateCarbonTaxSplits({ ...baseInput, vendorSplits: [] })
    ).toThrow("At least one vendor split must be defined");
  });

  it("executes statutory settlement and prevents replay / duplicate settlements", async () => {
    const settlement = await executeCarbonTaxSettlement(baseInput);
    expect(settlement.status).toBe("EXECUTED");
    expect(settlement.agreementId).toBe(baseInput.agreementId);
    expect(settlement.totalNetDisbursed).toBe(85050);

    // Attempting same agreementId must throw
    await expect(executeCarbonTaxSettlement(baseInput)).rejects.toThrow("already exists");

    // Attempting different agreementId with same settlementNonce must throw
    await expect(
      executeCarbonTaxSettlement({
        ...baseInput,
        agreementId: "AGR-SCOPE3-DIFFERENT",
      })
    ).rejects.toThrow("already exists");
  });
});
