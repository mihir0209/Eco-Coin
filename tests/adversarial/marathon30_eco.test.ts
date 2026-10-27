import { describe, it, expect } from "vitest";
import {
  calculateStakingYield,
  generateRetirementNftMetadata,
  calculateBiocharPermanence,
  evaluateCanopyDensity,
  calculateWetlandsMethaneOffset,
  calculateSoilOrganicCarbon,
  calculateDacCarbonNet,
  calculateOceanAlkalinityUptake,
  calculateBasaltMineralization,
  calculateMangroveBlueCarbon,
} from "../../lib/marathon30_eco_part1";
import {
  calculateRotationalGrazingOffset,
  calculateSilvopastureOffset,
  calculateUrbanMicroforestSavings,
  calculatePeatlandRewettingReduction,
  calculateBeccsNetCapture,
  calculateKelpDeepSeaSequestration,
  calculateCookstoveFuelReduction,
  calculateLandfillGasFlaringReduction,
  calculateWastewaterAerationSavings,
  calculateDairyDigesterBiogasAvoidance,
} from "../../lib/marathon30_eco_part2";
import {
  calculateRefrigerantDestructionGwp,
  calculateRiceAwdMethaneReduction,
  calculateClinkerReplacementSavings,
  calculateFleetEvDisplacement,
  calculateDistrictHeatingRecovery,
  calculateGreenHydrogenAbatement,
  calculateAviationSafBlendedReduction,
  calculateMarineSlowSteaming,
  calculateBuildingRetrofitInsulationSavings,
  aggregateScope3Rollup,
} from "../../lib/marathon30_eco_part3";

describe("Eco-Coin Marathon 30 Achievements Test Suite", () => {
  it("Achievement 1: Dynamic Staking Reward Router", () => {
    expect(calculateStakingYield(1000, 365)).toBe(100.0);
  });
  it("Achievement 2: Carbon Retirement NFT Metadata Generator", () => {
    const meta = generateRetirementNftMetadata("CERT-01", "0xUser", 50);
    expect(meta.standard).toBe("ERC-721-CARBON-RETIREMENT");
  });
  it("Achievement 3: Biochar Sequestration Permanence Calculator", () => {
    expect(calculateBiocharPermanence(100, 500)).toBe(75.0);
    expect(() => calculateBiocharPermanence(100, 300)).toThrow();
  });
  it("Achievement 4: Reforestation Canopy Telemetry Validator", () => {
    expect(evaluateCanopyDensity(1200, 1.0).rating).toBe("OPTIMAL_AFFORESTATION");
  });
  it("Achievement 5: Wetlands Methane Offset Engine", () => {
    expect(calculateWetlandsMethaneOffset(10, 0.5, 0.1)).toBe(112.0);
  });
  it("Achievement 6: Soil Organic Carbon Depth Ledger", () => {
    expect(calculateSoilOrganicCarbon(30, 1.2, 2.0, 10)).toBe(720.0);
  });
  it("Achievement 7: Direct Air Capture Net Accounting", () => {
    expect(calculateDacCarbonNet(1000, 0.1, 5.0)).toBe(4.9);
  });
  it("Achievement 8: Ocean Alkalinity Enhancement Router", () => {
    expect(calculateOceanAlkalinityUptake(100)).toBe(80.0);
  });
  it("Achievement 9: Basalt Mineralization Weathering Ledger", () => {
    expect(calculateBasaltMineralization(1000, 1200)).toBe(300.0);
  });
  it("Achievement 10: Mangrove Blue Carbon Tidal Flux Engine", () => {
    expect(calculateMangroveBlueCarbon(50, 10)).toBe(500.0);
  });
  it("Achievement 11: Regenerative Grassland Rotational Grazing Model", () => {
    expect(calculateRotationalGrazingOffset(100, 120)).toBe(120.0);
  });
  it("Achievement 12: Silvopasture Agroforestry Canopy Router", () => {
    expect(calculateSilvopastureOffset(50, 40)).toBe(100.0);
  });
  it("Achievement 13: Municipal Microforest Heat Island Carbon Model", () => {
    expect(calculateUrbanMicroforestSavings(500, 50)).toBe(10.0);
  });
  it("Achievement 14: Peatland Rewetting Subsidence Avoidance Ledger", () => {
    expect(calculatePeatlandRewettingReduction(100, 20)).toBe(1500.0);
  });
  it("Achievement 15: BECCS Net Lifecycle Negative Emission Model", () => {
    expect(calculateBeccsNetCapture(1000, 90)).toBe(315.0);
  });
  it("Achievement 16: Deep-Sea Kelp Forest Sequestration Router", () => {
    expect(calculateKelpDeepSeaSequestration(1000, 1500)).toBe(293.33);
    expect(calculateKelpDeepSeaSequestration(1000, 500)).toBe(0);
  });
  it("Achievement 17: Cookstove Biomass Displacement Ledger", () => {
    expect(calculateCookstoveFuelReduction(5, 365)).toBe(3.29);
  });
  it("Achievement 18: Landfill Methane Gas Flaring Destruction Engine", () => {
    expect(calculateLandfillGasFlaringReduction(500, 24)).toBe(379.33);
  });
  it("Achievement 19: Wastewater Aerobic vs Anaerobic Abatement Router", () => {
    expect(calculateWastewaterAerationSavings(1000, 200)).toBe(5.6);
  });
  it("Achievement 20: Dairy Digester Livestock Biogas Ledger", () => {
    expect(calculateDairyDigesterBiogasAvoidance(500, 30)).toBe(336.0);
  });
  it("Achievement 21: High-GWP Refrigerant Destruction Engine", () => {
    expect(calculateRefrigerantDestructionGwp("R404A", 100)).toBe(392.2);
  });
  it("Achievement 22: Rice Alternate Wetting and Drying (AWD) Ledger", () => {
    expect(calculateRiceAwdMethaneReduction(100, 90, 30)).toBe(224.0);
  });
  it("Achievement 23: Clinker Substitution Low-Carbon Cement Model", () => {
    expect(calculateClinkerReplacementSavings(1000, 30)).toBe(255.0);
  });
  it("Achievement 24: Commercial Fleet Electrification Displacement Router", () => {
    expect(calculateFleetEvDisplacement(5000)).toBe(13.4);
  });
  it("Achievement 25: District Industrial Waste-Heat Recovery Ledger", () => {
    expect(calculateDistrictHeatingRecovery(2000, 0.2)).toBe(400.0);
  });
  it("Achievement 26: Green Hydrogen Electrolyzer Carbon Intensity Model", () => {
    expect(calculateGreenHydrogenAbatement(10000, 10.0, 1.0)).toBe(90.0);
  });
  it("Achievement 27: Sustainable Aviation Fuel (SAF) Blender Router", () => {
    expect(calculateAviationSafBlendedReduction(10000, 80)).toBe(76.56);
  });
  it("Achievement 28: Marine Slow Steaming Bunker Fuel Offset Engine", () => {
    expect(calculateMarineSlowSteaming(24, 18, 5000)).toBe(340.16);
  });
  it("Achievement 29: Building Retrofit Envelope Thermodynamic Model", () => {
    expect(calculateBuildingRetrofitInsulationSavings(50000, 35000, 0.4)).toBe(6.0);
  });
  it("Achievement 30: Supply Chain Scope-3 Multi-Tier Rollup Aggregator", () => {
    const res = aggregateScope3Rollup(120, 450, 300, 80);
    expect(res.totalScope3TCO2e).toBe(950);
    expect(res.largestContributor).toBe("TIER_2");
  });
});
