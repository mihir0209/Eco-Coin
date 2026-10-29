import { describe, it, expect } from "vitest";
import { modelSeagrassMeadowCarbonStock } from "../../lib/seagrass_carbon_sequestration";
import { modelDirectOceanCaptureBipolar } from "../../lib/doc_bipolar_electrodialysis";
import { traceWollastoniteWeathering } from "../../lib/wollastonite_silicate_weathering";
import { evaluateHyperspectralCanopyHealth } from "../../lib/hyperspectral_nitrogen_defoliation";
import { auditCrossChainCarbonBridgeReserve } from "../../lib/crosschain_carbon_bridge_vault";

describe("Eco-Coin Batch 31 - 5 Production Achievements", () => {
  it("Achievement 1: Seagrass Meadow Benthic Syringodium Carbon Sequestration Model", () => {
    // 100 hectares dense meadow (1000 shoots/m2, 50cm mat)
    const meadow = modelSeagrassMeadowCarbonStock(100, 1000, 50.0, 4.0);
    expect(meadow.isMeadowHealthy).toBe(true);
    expect(meadow.annualRhizomeCarbonAccumulationTco2ePerHa).toBeGreaterThan(5.0);
    expect(meadow.millennialPermanenceScore).toBeGreaterThan(0.80);

    // Depleted meadow fails health check
    expect(modelSeagrassMeadowCarbonStock(100, 200, 10.0, 1.5).isMeadowHealthy).toBe(false);
  });

  it("Achievement 2: Direct Ocean Capture (DOC) Electrodialytic Bipolar Membrane Acidification", () => {
    // 500 m3/h seawater, 1000A current at 1.6V cell
    const doc = modelDirectOceanCaptureBipolar(500, 25000.0, 1.6, 2.1);
    expect(doc.extractedCo2KgPerHour).toBeGreaterThan(25.0);
    expect(doc.specificEnergyKwhPerTonCo2).toBeLessThan(1500.0);
    expect(doc.effluentAcidicPh).toBeLessThan(7.0);
  });

  it("Achievement 3: Enhanced Weathering Wollastonite Calcium Silicate Field Dissolution Tracer", () => {
    // 1000 tonnes wollastonite applied, 500,000L rainfall, pH 6.0
    const wolla = traceWollastoniteWeathering(1000, 500000, 6.0, 25.0);
    expect(wolla.netCo2CaptureTonnes).toBeGreaterThan(150.0);
    expect(wolla.calciumIonsReleasedMolPerM3).toBeGreaterThan(1.0);
    expect(wolla.dissolutionHalfLifeDays).toBeLessThan(2000);
  });

  it("Achievement 4: Satellite Hyperspectral Canopy Nitrogen Ratio Defoliation Sentinel", () => {
    // Healthy canopy: R750=0.60, R705=0.20 -> NCI = (0.6-0.2)/(0.6+0.2) = 0.50
    const healthy = evaluateHyperspectralCanopyHealth(0.20, 0.60, 0.05);
    expect(healthy.canopyHealthTier).toBe("VIGOROUS");
    expect(healthy.defoliationStressDetected).toBe(false);

    // Defoliated canopy: R750=0.30, R705=0.25 -> NCI = 0.09 < 0.20
    const stressed = evaluateHyperspectralCanopyHealth(0.25, 0.30, 0.12);
    expect(stressed.canopyHealthTier).toBe("SEVERE_DEFOLIATION");
    expect(stressed.defoliationStressDetected).toBe(true);
  });

  it("Achievement 5: Cross-Chain Carbon Credit Liquidity Bridge Fractional Reserve Sentinel", () => {
    // Fully backed 1:1 bridge (10,000 bridged tokens, 10,000 locked certs)
    const backed = auditCrossChainCarbonBridgeReserve(10000, 10000, 100.0);
    expect(backed.isFractionalReserveHealthy).toBe(true);
    expect(backed.reserveRatioPct).toBe(100.0);
    expect(backed.rebalanceRequired).toBe(false);

    // Unbacked fractional reserve (10,000 tokens, 8,500 certs = 85%)
    const unbacked = auditCrossChainCarbonBridgeReserve(10000, 8500, 100.0);
    expect(unbacked.isFractionalReserveHealthy).toBe(false);
    expect(unbacked.rebalanceRequired).toBe(true);
  });
});
