import { describe, it, expect } from "vitest";
import { calculateMicroStakeYield } from "../../lib/carbon_micro_staking_pool";
import { modelMangroveSedimentCarbonStock } from "../../lib/mangrove_sediment_core";
import { calculateBiocharMetalSorption } from "../../lib/biochar_metal_immobilization";
import { constructMicrogridFlexBid } from "../../lib/microgrid_flex_bidding";
import { generatePqcRetirementSignature, verifyPqcRetirementSignature } from "../../lib/pqc_retirement_signer";

describe("Eco-Coin Batch 25 - 5 Production Achievements", () => {
  it("Achievement 1: Carbon Credit Micro-Staking Yield Calculator", () => {
    // Stake 100 tCO2e for 365 days at $25/t, base 6% APY -> 10% APY ($250 yield)
    const stake = calculateMicroStakeYield(100, 365, 25.0, 6.0);
    expect(stake.effectiveApyPct).toBe(10.0);
    expect(stake.accruedYieldUsd).toBe(250.0);
    expect(stake.totalMaturityValueUsd).toBe(2750.0);

    expect(calculateMicroStakeYield(0, 365).accruedYieldUsd).toBe(0);
  });

  it("Achievement 2: Mangrove Sediment Core Carbon Burial Depth Model", () => {
    // 2.0m depth, 1.2 g/cm3 bulk density, 5% carbon, 50 ha area
    const stock = modelMangroveSedimentCarbonStock(2.0, 1.2, 5.0, 50);
    expect(stock.totalBuriedCarbonTco2e).toBeGreaterThan(20000);
    expect(stock.permanenceCenturyHorizon).toBe(8.0); // 2000mm / 2.5 = 800 yrs = 8 centuries
    expect(stock.annualAccretionTco2e).toBeGreaterThan(0);
  });

  it("Achievement 3: Biochar Heavy Metal Immobilization and Remediation", () => {
    // 20 tons biochar applied to soil with 50 ppm Pb and 10 ppm Cd
    const sorption = calculateBiocharMetalSorption(20, 50, 10, 8.5);
    expect(sorption.immobilizedLeadKg).toBeGreaterThan(50);
    expect(sorption.soilToxicityReductionPct).toBeGreaterThan(50);
  });

  it("Achievement 4: Microgrid Battery Flexibility Bidding Engine", () => {
    // 500 kWh battery at 80% SoC, market clearing price $0.25 vs degradation $0.08
    const bid = constructMicrogridFlexBid(500, 80.0, 0.25, 0.08);
    expect(bid).not.toBeNull();
    expect(bid!.offeredKwh).toBe(250.0); // (80 - 30) = 50% of 500
    expect(bid!.expectedMarginUsd).toBeGreaterThan(40);

    // Unprofitable market price
    expect(constructMicrogridFlexBid(500, 80.0, 0.05, 0.08)).toBeNull();
  });

  it("Achievement 5: Post-Quantum NIST Dilithium Retirement Signer", () => {
    const envelope = generatePqcRetirementSignature("CERT-PQC-999", "0xBeneficiary", 100, "CRYSTALS-Dilithium3");
    expect(envelope.isNistPqcCompliant).toBe(true);
    expect(envelope.signatureHex).toHaveLength(64);

    const valid = verifyPqcRetirementSignature(envelope);
    expect(valid).toBe(true);

    const tampered = { ...envelope, tco2e: 200 };
    expect(verifyPqcRetirementSignature(tampered)).toBe(false);
  });
});
