import { describe, it, expect } from "vitest";
import { computeOptimalAllocations } from "../../lib/dynamic_yield_rebalancer";
import { generateBondSchedule } from "../../lib/green_bond_amortization";
import { calculateMicrogridTrade } from "../../lib/microgrid_p2p_settlement";
import { generateBatchCommitment, verifyProvenanceCommitment } from "../../lib/zk_carbon_provenance";
import { calculateCbamTariff } from "../../lib/cbam_tariff_router";

describe("Eco-Coin Batch 20 - 5 Production Achievements", () => {
  it("Achievement 1: Dynamic Yield Rebalancer computes optimal LP allocations", () => {
    // Narrow spread (< 2%) -> no rebalance needed (50/50)
    const narrow = computeOptimalAllocations(5.0, 5.8, 2.0);
    expect(narrow.shouldRebalance).toBe(false);
    expect(narrow.targetAllocationA).toBe(50);

    // Wide spread (A 12% vs B 4%) -> rebalances heavily to A
    const wide = computeOptimalAllocations(12.0, 4.0, 2.0);
    expect(wide.shouldRebalance).toBe(true);
    expect(wide.targetAllocationA).toBe(80);
    expect(wide.targetAllocationB).toBe(20);
  });

  it("Achievement 2: Green Bond Amortization generates correct coupon cashflows", () => {
    // $10,000 bond, 6% annual rate, 2 years, semiannual coupons = 4 periods of $300
    const schedule = generateBondSchedule(10000, 6.0, 2, 2);
    expect(schedule).toHaveLength(4);
    expect(schedule[0].couponAmount).toBe(300);
    expect(schedule[0].principalRepayment).toBe(0);
    expect(schedule[3].principalRepayment).toBe(10000);
    expect(schedule[3].totalCashflow).toBe(10300);
    expect(schedule[3].remainingPrincipal).toBe(0);
  });

  it("Achievement 3: Microgrid P2P Trade calculates transmission loss and net cost", () => {
    // 100 kWh generated at $0.15/kWh with 5% loss -> 95 kWh delivered, cost $14.25
    const trade = calculateMicrogridTrade(100, 0.15, 0.05);
    expect(trade.gridLossKwh).toBe(5);
    expect(trade.netDelivered).toBe(95);
    expect(trade.totalCost).toBe(14.25);
  });

  it("Achievement 4: ZK Carbon Provenance commitment generation and verification", () => {
    const salt = "s3cr3t_zk_salt_9999999999999999";
    const commitment = generateBatchCommitment("PROJ-AMAZON-01", "SER-00412", 2026, salt);
    expect(commitment).toHaveLength(64);

    const valid = verifyProvenanceCommitment("PROJ-AMAZON-01", "SER-00412", 2026, salt, commitment);
    expect(valid).toBe(true);

    const tampered = verifyProvenanceCommitment("PROJ-AMAZON-01", "SER-00412", 2025, salt, commitment);
    expect(tampered).toBe(false);
  });

  it("Achievement 5: CBAM Tariff Router computes net liability with origin tax deduction", () => {
    // 500 tCO2e, EU benchmark €80/t, Origin country carbon tax €30/t -> Gross 40,000, Credit 15,000, Net 25,000
    const cbam = calculateCbamTariff(500, 80, 30);
    expect(cbam.grossLiability).toBe(40000);
    expect(cbam.originCredit).toBe(15000);
    expect(cbam.netPayable).toBe(25000);

    // If origin tax equals or exceeds EU benchmark -> zero net tariff payable
    const exempt = calculateCbamTariff(500, 80, 85);
    expect(exempt.netPayable).toBe(0);
  });
});
