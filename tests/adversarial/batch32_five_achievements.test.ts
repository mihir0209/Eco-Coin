import { describe, it, expect } from "vitest";
import { verifyZkAdditionalityProof } from "../../lib/zk_additionality_proof";
import { modelTidalSaltMarshAccretion } from "../../lib/salt_marsh_carbon_accretion";
import { traceSoilMicrobialBiomassCarbon } from "../../lib/soil_microbial_carbon_tracer";
import { estimateGediLidarBiomass } from "../../lib/gedi_lidar_canopy_height";
import { balanceArtificialUpwellingNutrients } from "../../lib/ocean_upwelling_nutrient_balancer";

describe("Eco-Coin Batch 32 - 5 Production Achievements", () => {
  it("Achievement 1: Cryptographic Zero-Knowledge Proof of Additionality Registry", () => {
    const validHash = "0x" + "a".repeat(64);
    // Baseline 10,000 tCO2e, actual 4,000 tCO2e -> 6,000 tCO2e certified net removal
    const verified = verifyZkAdditionalityProof(10000, 4000, validHash);
    expect(verified.isAdditionalityValid).toBe(true);
    expect(verified.certifiedNetRemovalTco2e).toBe(6000.0);
    expect(verified.circuitConstraintVerified).toBe(true);

    // Negative additionality (actual >= baseline) fails
    const invalid = verifyZkAdditionalityProof(5000, 6000, validHash);
    expect(invalid.isAdditionalityValid).toBe(false);
    expect(invalid.certifiedNetRemovalTco2e).toBe(0);
  });

  it("Achievement 2: Tidal Salt Marsh Sediment Elevation Carbon Accretion Model", () => {
    // 5.0 mm/yr accretion outpacing 3.5 mm/yr sea level rise
    const healthy = modelTidalSaltMarshAccretion(5.0, 3.5, 850.0);
    expect(healthy.marshHealthStatus).toBe("ACCRETING_HEALTHY");
    expect(healthy.annualBiomassSequestrationTco2ePerHa).toBeGreaterThan(30.0);
    expect(healthy.elevationDeficitAgainstSeaLevelRiseMmYr).toBeLessThan(0);

    // Drowning marsh (2.0 mm/yr accretion vs 4.0 mm/yr SLR)
    const drowning = modelTidalSaltMarshAccretion(2.0, 4.0, 850.0);
    expect(drowning.marshHealthStatus).toBe("SUBMERGENCE_RISK");
  });

  it("Achievement 3: Soil Microbial Biomass Carbon Chloroform Fumigation Extraction Tracer", () => {
    // Fumigated = 180 mg/kg, non-fumigated = 45 mg/kg -> diff = 135 mg/kg / 0.45 = 300 mg/kg MBC
    const mbc = traceSoilMicrobialBiomassCarbon(180.0, 45.0, 25.0, 0.45);
    expect(mbc.microbialBiomassCarbonMgKg).toBe(300.0);
    expect(mbc.microbialQuotientPct).toBe(1.2); // 300 / 25000 = 1.2%
  });

  it("Achievement 4: Automated Remote Sensing Forest Canopy Height GEDI Lidar Estimator", () => {
    // Old growth canopy (42m RH98)
    const oldGrowth = estimateGediLidarBiomass(42.0);
    expect(oldGrowth.forestStratumTier).toBe("OLD_GROWTH_PRIMARY");
    expect(oldGrowth.estimatedAboveGroundBiomassTonnesPerHa).toBeGreaterThan(100.0);
    expect(oldGroundGrowthCarbonCheck(oldGrowth.aboveGroundCarbonStockTco2ePerHa)).toBe(true);

    function oldGroundGrowthCarbonCheck(val: number) { return val > 200.0; }

    // Young regenerating forest (20m RH98)
    const young = estimateGediLidarBiomass(20.0);
    expect(young.forestStratumTier).toBe("SECONDARY_REGENERATING");
  });

  it("Achievement 5: Ocean Upwelling Nutrient Pumping Dissolved Inorganic Nitrogen Balancer", () => {
    // Deep seawater with 32 umol/L DIN and 2.0 umol/L DIP -> N:P = 16.0 (Perfect Redfield ratio)
    const balanced = balanceArtificialUpwellingNutrients(50.0, 32.0, 2.0);
    expect(balanced.isRedfieldCompliant).toBe(true);
    expect(balanced.redfieldRatioNToP).toBe(16.0);
    expect(balanced.harmfulAlgalBloomRisk).toBe(false);

    // Highly unbalanced nutrient flow (DIN = 60, DIP = 1.5 -> N:P = 40)
    const unbalanced = balanceArtificialUpwellingNutrients(50.0, 60.0, 1.5);
    expect(unbalanced.isRedfieldCompliant).toBe(false);
    expect(unbalanced.harmfulAlgalBloomRisk).toBe(true);
  });
});
