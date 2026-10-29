import { describe, it, expect } from "vitest";
import { modelDacLiquidKohAbsorption } from "../../lib/dac_liquid_koh_absorption";
import { evaluateCoralAragoniteCalcification } from "../../lib/coral_reef_aragonite_biosensor";
import { calibrateSoilCarbonLibsSpectra } from "../../lib/soil_carbon_libs_calibration";
import { modelMacroalgaeBiomethaneDigestion } from "../../lib/macroalgae_anaerobic_digestion";
import { evaluateInSarPeatlandSubsidence } from "../../lib/insar_peatland_subsidence_monitor";

describe("Eco-Coin Batch 34 - 5 Production Achievements", () => {
  it("Achievement 1: Direct Air Capture Liquid Solvent Potassium Hydroxide Pellet Model", () => {
    // 1000 m3/s air contactor at 420 ppm CO2 with 6m packed column
    const dac = modelDacLiquidKohAbsorption(1000.0, 420.0, 2.0, 6.0);
    expect(dac.co2CapturedKgPerHour).toBeGreaterThan(2000.0);
    expect(dac.potassiumCarbonateFormedKgPerHour).toBeGreaterThan(6000.0);
    expect(dac.causticizationEfficiencyPct).toBeGreaterThan(80.0);
    expect(dac.contactorPressureDropPa).toBeLessThan(300);
  });

  it("Achievement 2: Coral Reef Aragonite Calcification Stress Early Warning Biosensor", () => {
    // Pristine tropical reef: Omega = 3.8, SST = 28.0C (below MMM) -> Healthy calcification
    const healthy = evaluateCoralAragoniteCalcification(3.8, 28.0, 28.5);
    expect(healthy.bleachingAndCorrosionRisk).toBe("NORMAL_HEALTHY");
    expect(healthy.netCalcificationRateGramsCaCo3M2Day).toBeGreaterThan(30.0);

    // Ocean acidification & heatwave: Omega = 0.8 (< 1.0 undersaturated), SST = 32.0C -> Corrosion
    const degraded = evaluateCoralAragoniteCalcification(0.8, 32.0, 28.5, 4.0);
    expect(degraded.bleachingAndCorrosionRisk).toBe("CRITICAL_SKELETON_CORROSION");
    expect(degraded.netCalcificationRateGramsCaCo3M2Day).toBeLessThan(0); // Net dissolution
  });

  it("Achievement 3: Soil Organic Carbon Laser-Induced Breakdown Spectroscopy (LIBS) Calibration", () => {
    // Strong carbon emission peak at 247.86 nm with low background
    const libs = calibrateSoilCarbonLibsSpectra(5000, 0.45, 500);
    expect(libs.carbonPeakIntensityC247nm).toBe(4500);
    expect(libs.plasmaStabilityRatio).toBe(10.0);
    expect(libs.calibratedSoilOrganicCarbonPct).toBeGreaterThan(4.0);
  });

  it("Achievement 4: Ocean Macroalgae Anaerobic Digestion Biomethane Carbon Ratio Optimizer", () => {
    // 50 wet tonnes kelp per day
    const digest = modelMacroalgaeBiomethaneDigestion(50.0);
    expect(digest.biomethaneGeneratedM3PerDay).toBeGreaterThan(1500.0);
    expect(digest.co2CapturedBiogasM3PerDay).toBeGreaterThan(1000.0);
    expect(digest.netRenewableEnergyMwhPerDay).toBeGreaterThan(15.0);
  });

  it("Achievement 5: Satellite SAR Interferometry (InSAR) Peatland Surface Subsidence Monitor", () => {
    // Phase difference -4.5 rad over 12 days -> ~ -2.0 cm displacement -> ~ -60 mm/yr rapid subsidence
    const insar = evaluateInSarPeatlandSubsidence(-4.5, 12, 5.55, 0.75);
    expect(insar.subsidenceRateMmPerYear).toBeLessThan(-30.0);
    expect(insar.inferredCarbonLossTco2ePerHaYr).toBeGreaterThan(25.0);
    expect(insar.isOxidationSubsidenceSevere).toBe(true);
  });
});
