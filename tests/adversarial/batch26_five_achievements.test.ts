import { describe, it, expect } from "vitest";
import { calculateMethanePyrolysisBioHydrogen } from "../../lib/biohydrogen_pyrolysis";
import { calculateConcreteMineralizationCuring } from "../../lib/concrete_carbon_curing";
import { evaluateMaritimePlumeEmissions } from "../../lib/sentinel5p_so2_tracker";
import { calculateHempInsulationCarbonBenefit } from "../../lib/hemp_insulation_carbon";
import { optimizeZkBatchVerification } from "../../lib/zk_snark_gas_vault";

describe("Eco-Coin Batch 26 - 5 Production Achievements", () => {
  it("Achievement 1: Methane Pyrolysis Bio-Hydrogen and Carbon Black Model", () => {
    // 1000 kg methane at 85% conversion
    const res = calculateMethanePyrolysisBioHydrogen(1000, 85);
    expect(res.h2ProducedKg).toBe(212.5); // 1000 * 0.25 * 0.85
    expect(res.solidCarbonBlackKg).toBe(637.5); // 1000 * 0.75 * 0.85
    expect(res.avoidedCo2EmissionsKg).toBe(1912.5); // 212.5 * 9
  });

  it("Achievement 2: Concrete Carbonate Mineralization Curing Chamber", () => {
    // 100 tons concrete with 99% pure CO2 injection
    const res = calculateConcreteMineralizationCuring(100, 99.0, 14.0);
    expect(res.permanentlyMineralizedCo2Kg).toBeGreaterThan(1400);
    expect(res.compressiveStrengthGainPct).toBeGreaterThan(15.0);
  });

  it("Achievement 3: Sentinel-5P Maritime SO2 & NO2 Plume Tracker", () => {
    // High SO2 / NO2 ratio indicating high sulfur bunker fuel (> 0.50% cap)
    const dirty = evaluateMaritimePlumeEmissions(0.0025, 0.0015, 20);
    expect(dirty.isSulfurCapExceeded).toBe(true);
    expect(dirty.estimatedFuelSulfurPct).toBeGreaterThan(0.50);
    expect(dirty.compliancePenaltyTco2e).toBeGreaterThan(50);

    // Clean LNG/scrubber vessel
    const clean = evaluateMaritimePlumeEmissions(0.0002, 0.0015, 20);
    expect(clean.isSulfurCapExceeded).toBe(false);
    expect(clean.compliancePenaltyTco2e).toBe(0);
  });

  it("Achievement 4: Regenerative Hemp Fiber Insulation Carbon Calculator", () => {
    // 50 m3 hemp insulation at 35 kg/m3 density
    const hemp = calculateHempInsulationCarbonBenefit(50, 35.0, 44.0);
    expect(hemp.sequesteredBiogenicCo2Kg).toBeGreaterThan(2500);
    expect(hemp.avoidedMineralWoolCo2Kg).toBeGreaterThan(2000);
    expect(hemp.netLcaCreditKg).toBe(hemp.sequesteredBiogenicCo2Kg + hemp.avoidedMineralWoolCo2Kg);
  });

  it("Achievement 5: Zero-Knowledge SNARK Verification Gas Optimization Vault", () => {
    const proofs = ["proof1_hash", "proof2_hash", "proof3_hash", "proof4_hash"];
    const inputs = ["input1", "input2"];
    const batch = optimizeZkBatchVerification(proofs, inputs);
    expect(batch.isBatchValid).toBe(true);
    expect(batch.aggregateRootHash).toHaveLength(64);
    // 4 * 200k = 800k vs (250k + 4*15k) = 310k -> 490k gas saved
    expect(batch.gasSavedUnits).toBe(490000);
  });
});
