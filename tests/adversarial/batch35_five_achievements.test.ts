import { describe, it, expect } from "vitest";
import { verifySoilCarbonIsotopeRatio } from "../../lib/soil_carbon_isotope_vault";
import { modelBenthicBioturbationFlux } from "../../lib/benthic_bioturbation_sentinel";
import { modelDuniteAcidMineNeutralization } from "../../lib/dunite_acid_drainage_neutralizer";
import { computeTvdiPeatDroughtIndex } from "../../lib/tvdi_peat_drought_scorer";
import { calculateCarbonRemovalBondYield } from "../../lib/carbon_removal_bond_yield";

describe("Eco-Coin Batch 35 - 5 Production Achievements", () => {
  it("Achievement 1: Cryptographic Zero-Knowledge Spatial Soil Carbon Isotope Attestation Vault", () => {
    // Authentic C3 forest soil (measured ratio ~ 0.01095 -> delta13C ~ -25.5 permil)
    const forest = verifySoilCarbonIsotopeRatio(0.0109506, 0.0112372);
    expect(forest.isOriginVerifiedAuthentic).toBe(true);
    expect(forest.delta13CPermil).toBeLessThan(-20.0);
    expect(forest.provenanceTier).toBe("C3_FOREST_CANOPY");
    expect(forest.fractionC3VegetationInput).toBeGreaterThan(0.70);

    // Inauthentic synthetic carbon outlier (e.g. +10 permil)
    const synthetic = verifySoilCarbonIsotopeRatio(0.0113495, 0.0112372);
    expect(synthetic.isOriginVerifiedAuthentic).toBe(false);
    expect(synthetic.provenanceTier).toBe("SYNTHETIC_ANOMALY");
  });

  it("Achievement 2: Benthic Macroinvertebrate Bioturbation Oxygen Flux Sequestration Sentinel", () => {
    // 500 macrofauna/m2 under hypoxic bottom water (1.5 mg/L O2)
    const hypoxic = modelBenthicBioturbationFlux(500, 1.5, 0.20);
    expect(hypoxic.isAnoxicBurialStable).toBe(true);
    expect(hypoxic.biodiffusionCoefficientDbCm2Yr).toBeGreaterThan(0.30);
    expect(hypoxic.annualCarbonBurialFluxTco2ePerHa).toBeGreaterThan(10.0);
  });

  it("Achievement 3: Enhanced Weathering Dunite Acid Mine Drainage Neutralization Model", () => {
    // 5,000 m3/day of acidic drainage at pH 2.2 neutralized to pH 7.0
    const dunite = modelDuniteAcidMineNeutralization(5000, 2.2, 7.0, 0.90);
    expect(dunite.duniteTonsRequiredPerDay).toBeGreaterThan(1.0);
    expect(dunite.neutralizedSulfuricAcidTonnesPerDay).toBeGreaterThan(1.0);
    expect(dunite.netCo2CapturePotentialTonnes).toBeGreaterThan(0.30);
    expect(dunite.effluentPhTargetReached).toBe(true);
  });

  it("Achievement 4: Multi-Temporal Optical-Thermal Evapotranspiration Peat Drought Risk Scorer", () => {
    // High thermal anomaly (Ts = 36C vs wet edge 22C, dry edge 38C) -> TVDI = 0.88 (Severe fire risk)
    const drought = computeTvdiPeatDroughtIndex(36.0, 0.35, 22.0, 38.0);
    expect(drought.droughtSeverityCategory).toBe("SEVERE_FIRE_RISK");
    expect(drought.temperatureVegetationDrynessIndex).toBeGreaterThan(0.75);
    expect(drought.peatIgnitionProbabilityPct).toBeGreaterThan(70.0);
    expect(drought.waterManagementRecommendation).toContain("CANAL_BLOCKING");

    // Wet peat dome (Ts = 24C)
    const wet = computeTvdiPeatDroughtIndex(24.0, 0.80, 22.0, 38.0);
    expect(wet.droughtSeverityCategory).toBe("WET_OPTIMAL");
  });

  it("Achievement 5: Decentralized Autonomous Carbon Removal Bond Yield Curve Staking Model", () => {
    // $100,000 staked over 4 years of verified permanence
    const bond = calculateCarbonRemovalBondYield(100000, 5, 4, 7.5, false);
    expect(bond.isPermanenceDefaultTriggered).toBe(false);
    expect(bond.annualStakingYieldPct).toBeGreaterThan(8.5);
    expect(bond.accruedYieldUsd).toBeGreaterThan(30000.0);

    // Default / reversal event -> 100% slashing penalty
    const slashed = calculateCarbonRemovalBondYield(100000, 5, 2, 7.5, true);
    expect(slashed.isPermanenceDefaultTriggered).toBe(true);
    expect(slashed.slashingPenaltyOnDefaultUsd).toBe(100000.0);
  });
});
