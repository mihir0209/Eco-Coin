import { describe, it, expect } from "vitest";
import { calculateIronFertilizationCarbonExport } from "../../lib/ocean_iron_fertilization";
import { modelMoistureSwingDacDesorption } from "../../lib/dac_moisture_swing";
import { calculateOlivineDissolutionRate } from "../../lib/olivine_coastal_weathering";
import { calculateWaferFabricationScope3 } from "../../lib/semiconductor_scope3_footprint";
import { routeRetrospectiveRoyalty } from "../../lib/carbon_retrospective_royalty";

describe("Eco-Coin Batch 27 - 5 Production Achievements", () => {
  it("Achievement 1: Ocean Iron Fertilization Redfield Carbon Export Model", () => {
    // 5 tons iron added in deep water (1000m) with 4x chlorophyll surge
    const deep = calculateIronFertilizationCarbonExport(5.0, 0.2, 0.8, 1000);
    expect(deep.mesopelagicPermanenceValid).toBe(true);
    expect(deep.chlorophyllSurgeRatio).toBe(4.0);
    expect(deep.netCarbonExportTco2e).toBeGreaterThan(1000);

    // Shallow waters (<500m) fail permanence check
    const shallow = calculateIronFertilizationCarbonExport(5.0, 0.2, 0.8, 200);
    expect(shallow.mesopelagicPermanenceValid).toBe(false);
    expect(shallow.netCarbonExportTco2e).toBe(0);
  });

  it("Achievement 2: Ambient Moisture-Swing Resin Direct Air Capture Desorption", () => {
    // 1000kg resin dry ambient 25% RH, chamber wet 90% RH
    const dac = modelMoistureSwingDacDesorption(1000, 25.0, 90.0);
    expect(dac.co2ReleasedKg).toBe(26.0); // 40kg * 0.65
    expect(dac.parasiticWaterLiters).toBe(65.0);
    expect(dac.thermalEnergySavedMwhVsThermal).toBeGreaterThan(0.03);

    // High ambient humidity (>40%) fails absorption prerequisite
    expect(modelMoistureSwingDacDesorption(1000, 60.0, 90.0).co2ReleasedKg).toBe(0);
  });

  it("Achievement 3: Coastal Olivine Weathering Dissolution Rate & Surface Area", () => {
    // 10,000 tons olivine, 50 micron grain size, 20C seawater
    const weathering = calculateOlivineDissolutionRate(10000, 50, 20);
    expect(weathering.specificSurfaceAreaM2PerTon).toBeGreaterThan(30000);
    expect(weathering.annualCo2UptakeTco2e).toBeGreaterThan(500);
    expect(weathering.dissolutionYearsTo80Pct).toBeLessThan(50);
  });

  it("Achievement 4: Semiconductor Wafer Cleanroom Fabrication Scope-3 Footprint", () => {
    // 100,000 cm2 wafer area at advanced 5nm node
    const wafer = calculateWaferFabricationScope3(100000, 5, 90.0);
    expect(wafer.embodiedEmissionsKgCo2e).toBeGreaterThan(50000);
    expect(wafer.pfcEmissionsKgCo2e).toBeGreaterThan(10000);
    expect(wafer.totalScope3Tco2e).toBeGreaterThan(100);
  });

  it("Achievement 5: Retrospective Carbon Credit Royalty & Indigenous Fund Router", () => {
    // $100,000 secondary trade with 300 bps (3%) royalty
    const split = routeRetrospectiveRoyalty(100000, 5, 300);
    expect(split.originatingProjectRoyaltyUsd).toBe(1500.0); // 50% of 3000
    expect(split.indigenousCommunityFundUsd).toBe(900.0);    // 30% of 3000
    expect(split.protocolTreasuryUsd).toBe(600.0);          // 20% of 3000
    expect(split.netSellerProceedsUsd).toBe(97000.0);
  });
});
