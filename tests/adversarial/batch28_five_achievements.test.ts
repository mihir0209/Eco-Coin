import { describe, it, expect } from "vitest";
import { evaluateKelpAbyssalDeposition } from "../../lib/kelp_abyssal_deposition";
import { modelMethanotrophicBiofilter } from "../../lib/methanotrophic_biofilter";
import { traceBasaltWeatheringLeachate } from "../../lib/basalt_cation_weathering";
import { registerPhysicalCarbonCore } from "../../lib/carbon_core_registry";
import { calculateDynamicVolatilityFee } from "../../lib/amm_volatility_fee_dampener";

describe("Eco-Coin Batch 28 - 5 Production Achievements", () => {
  it("Achievement 1: Kelp Macroalgae Abyssal Sinking & Anoxic Deposition Verifier", () => {
    // 500 tonnes wet kelp deployed at 2500m with confirmed anoxia
    const abyssal = evaluateKelpAbyssalDeposition(500, 2500, true, 1080.0);
    expect(abyssal.isPermanentlySequestered).toBe(true);
    expect(abyssal.sinkingVelocityMetersPerDay).toBeGreaterThan(200.0);
    expect(abyssal.sequesteredCo2Tonnes).toBeGreaterThan(50.0);
    expect(abyssal.refractoryCarbonFraction).toBe(0.85);

    // Shallow deployment (<1000m) fails permanence
    expect(evaluateKelpAbyssalDeposition(500, 400, true).isPermanentlySequestered).toBe(false);
  });

  it("Achievement 2: Aerobic Methanotrophic Biofilter 20-Yr GWP Reduction", () => {
    // 1000 m3/hr airflow with 1000 ppm CH4 inlet under optimal 22C & 55% moisture
    const bio = modelMethanotrophicBiofilter(1000, 1000, 22.0, 55.0);
    expect(bio.oxidationEfficiencyPct).toBeGreaterThan(70.0);
    expect(bio.outletCh4GramsPerM3).toBeLessThan(bio.inletCh4GramsPerM3);
    expect(bio.co2eGwpReducedKgPerHour).toBeGreaterThan(35.0);
  });

  it("Achievement 3: Basalt Enhanced Weathering Leachate Cation Tracing", () => {
    // 100,000 L leachate with 80 ppm Ca and 45 ppm Mg
    const basalt = traceBasaltWeatheringLeachate(100000, 80, 45, 120, 450);
    expect(basalt.calciumMagnesiumReleasedMolM3).toBeGreaterThan(3.0);
    expect(basalt.inferredCo2DrawnDownTonnes).toBeGreaterThan(0.03);
    expect(basalt.soilPhShift).toBeGreaterThan(0.03);
  });

  it("Achievement 4: Physical Carbon Core Georeferenced Sample Registry", () => {
    const core = registerPhysicalCarbonCore("CORE-77", [-122.4, 37.7, -122.3, 37.8], 100, 1.35, 4.2);
    expect(core.sampleId).toBe("CORE-77");
    expect(core.merkleLeafHash).toMatch(/^0x[a-f0-9]{8}$/);
  });

  it("Achievement 5: Dynamic AMM Volatility Fee Dampener for LVR Mitigation", () => {
    // Low volatility (30% annual) -> baseline 30 bps
    const calm = calculateDynamicVolatilityFee(30.0, 30);
    expect(calm.dynamicFeeBps).toBe(30);
    expect(calm.isLvrProtected).toBe(false);

    // High volatility (90% annual) -> surcharge added
    const volatile = calculateDynamicVolatilityFee(90.0, 30);
    expect(volatile.isLvrProtected).toBe(true);
    expect(volatile.volatilitySurchargeBps).toBeGreaterThan(20);
    expect(volatile.dynamicFeeBps).toBeGreaterThan(50);
  });
});
