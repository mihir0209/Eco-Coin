import { describe, it, expect } from "vitest";
import { modelPeatlandRadiativeBalance } from "../../lib/peatland_water_table_balance";
import { modelOceanLimingSurfacePlume } from "../../lib/ocean_liming_plume_dispersion";
import { traceAgroforestryCarbonStratification } from "../../lib/agroforestry_soil_carbon_tracer";
import { detectSarForestDisturbance } from "../../lib/sar_forest_disturbance_sentinel";
import { evaluateParametricCatastrophePayout } from "../../lib/carbon_catastrophe_reinsurance_vault";

describe("Eco-Coin Batch 30 - 5 Production Achievements", () => {
  it("Achievement 1: Peatland Water Table Depth Methane vs CO2 Radiative Balance Model", () => {
    // Optimal water table (15 cm below surface) -> Minimal radiative forcing
    const optimal = modelPeatlandRadiativeBalance(15.0, 20.0);
    expect(optimal.optimalWaterTableMaintained).toBe(true);
    expect(optimal.netRadiativeForcingTco2ePerHaYr).toBeLessThan(5.0);

    // Over-drained peat (50 cm below surface) -> massive aerobic CO2 emissions
    const drained = modelPeatlandRadiativeBalance(50.0, 20.0);
    expect(drained.optimalWaterTableMaintained).toBe(false);
    expect(drained.co2EmissionsTco2ePerHaYr).toBeGreaterThan(25.0);
  });

  it("Achievement 2: Ocean Liming Calcium Hydroxide Dissolution Surface Plume Dispersion Model", () => {
    // 100 tonnes Ca(OH)2 after 6 hours
    const liming = modelOceanLimingSurfacePlume(100.0, 6.0, 8.10, 2.0);
    expect(liming.effectiveAlkalinityAddedMol).toBeGreaterThan(2e6);
    expect(liming.inferredCo2DrawdownTco2e).toBeGreaterThan(90.0);
    expect(liming.surfacePlumeRadiusMeters).toBeGreaterThan(300.0);
    expect(liming.surfacePhPeak).toBeLessThan(8.25); // Plume diluted safely
  });

  it("Achievement 3: Agroforestry Shade-Grown Soil Organic Carbon Stratification Tracer", () => {
    // 50 ha agroforestry with 40% shade tree canopy
    const agro = traceAgroforestryCarbonStratification(50, 40.0, 3.0, 1.2);
    expect(agro.topsoilCarbonStockTco2ePerHa).toBeGreaterThan(350.0);
    expect(agro.deepSubsoilCarbonStockTco2ePerHa).toBeGreaterThan(450.0);
    expect(agro.shadeCanopyMultiTierBonusPct).toBe(15.0);
    expect(agro.totalSoilCarbonStockTco2ePerHa).toBeGreaterThan(800.0);
  });

  it("Achievement 4: Real-Time Satellite Synthetic Aperture Radar (SAR) Forest Disturbance Detector", () => {
    // Intact forest: baseline -12.5 dB, observed -12.8 dB -> clean
    const intact = detectSarForestDisturbance(-12.5, -12.8);
    expect(intact.isDeforestationAlert).toBe(false);
    expect(intact.backscatterDeltaDb).toBe(-0.3);

    // Cleared forest: observed drops to -18.0 dB (delta = -5.5 dB <= -3.5 dB threshold)
    const cleared = detectSarForestDisturbance(-12.5, -18.0);
    expect(cleared.isDeforestationAlert).toBe(true);
    expect(cleared.confidenceScore).toBeGreaterThan(0.80);
  });

  it("Achievement 5: Decentralized Carbon Buffer Pool Parametric Catastrophe Reinsurance Vault", () => {
    // Category 2 hurricane (85 knots >= 64 knots threshold)
    const hurricane = evaluateParametricCatastrophePayout(85.0, 40.0, 1000000.0, 500000.0);
    expect(hurricane.isPayoutTriggered).toBe(true);
    expect(hurricane.payoutAmountUsd).toBe(200000.0); // 40% of 500k
    expect(hurricane.remainingPoolReserveUsd).toBe(800000.0);

    // Calm weather
    const calm = evaluateParametricCatastrophePayout(30.0, 20.0, 1000000.0, 500000.0);
    expect(calm.isPayoutTriggered).toBe(false);
    expect(calm.payoutAmountUsd).toBe(0);
  });
});
