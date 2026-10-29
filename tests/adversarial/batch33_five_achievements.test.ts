import { describe, it, expect } from "vitest";
import { evaluateForaminiferaShellDissolution } from "../../lib/foraminifera_shell_dissolution";
import { governPeatDomeCatotelmHydraulics } from "../../lib/peat_dome_catotelm_governor";
import { modelSerpentinizationThermoelectric } from "../../lib/olivine_serpentinization_heat_recovery";
import { invertGnssReflectometryMoisture } from "../../lib/gnss_biomass_moisture_sentinel";
import { sieveCarbonRetirementNullifier } from "../../lib/carbon_double_counting_sieve";

describe("Eco-Coin Batch 33 - 5 Production Achievements", () => {
  it("Achievement 1: Oceanic Deep-Sea Benthic Foraminifera Shell Dissolution Sentinel", () => {
    // Shallow supersaturated zone (2000m, high carbonate) -> Omega > 1.0, pristine
    const pristine = evaluateForaminiferaShellDissolution(2000, 110.0);
    expect(pristine.calciteSaturationOmega).toBeGreaterThanOrEqual(1.0);
    expect(pristine.benthicCarbonPermanenceVerified).toBe(true);
    expect(pristine.preservationTier).toBe("PRISTINE_PRESERVATION");

    // Deep abyssal plain below CCD (5000m, low carbonate) -> Omega < 0.70, rapid corrosion
    const corrosive = evaluateForaminiferaShellDissolution(5000, 40.0);
    expect(corrosive.calciteSaturationOmega).toBeLessThan(0.70);
    expect(corrosive.benthicCarbonPermanenceVerified).toBe(false);
    expect(corrosive.preservationTier).toBe("RAPID_CCD_CORROSION");
  });

  it("Achievement 2: Tropical Peat Dome Catotelm Hydraulic Drawdown Governor", () => {
    // Controlled shallow drainage (0.3m depth) -> Protected catotelm
    const safe = governPeatDomeCatotelmHydraulics(0.30);
    expect(safe.catotelmIntegrityProtected).toBe(true);
    expect(safe.drawdownConeRadiusMeters).toBeLessThan(80.0);
    expect(safe.mitigationAction).toBe("SAFE_CANAL_BLOCKING_ACTIVE");

    // Hostile deep canal (1.2m drainage) -> Drawdown cone > 200m
    const dangerous = governPeatDomeCatotelmHydraulics(1.20);
    expect(dangerous.catotelmIntegrityProtected).toBe(false);
    expect(dangerous.drawdownConeRadiusMeters).toBeGreaterThan(150.0);
    expect(dangerous.mitigationAction).toContain("INSTALL_COMPACTED_PEAT_DAMS");
  });

  it("Achievement 3: Mineral Carbonation Olivine Serpentinization Heat Recovery Model", () => {
    // 500 kg/hr olivine reacting with 50 LPM water
    const heat = modelSerpentinizationThermoelectric(500.0, 50.0, 20.0);
    expect(heat.reactionExothermicHeatKw).toBeGreaterThan(200.0);
    expect(heat.hotFluidTempCelsius).toBeGreaterThan(60.0);
    expect(heat.thermoelectricPowerGeneratedKw).toBeGreaterThan(5.0);
    expect(heat.annualElectricityMwh).toBeGreaterThan(30.0);
  });

  it("Achievement 4: Multi-Constellation GNSS Real-Time Biomass Moisture Inversion", () => {
    // High reflection SNR notch (15 dB) -> Moist soil & lush canopy
    const moist = invertGnssReflectometryMoisture(15.0, 4.2);
    expect(moist.volumetricSoilMoisturePct).toBeGreaterThan(20.0);
    expect(moist.droughtStressDetected).toBe(false);

    // Dry soil (3 dB notch) -> Drought stress
    const dry = invertGnssReflectometryMoisture(1.0, 1.0);
    expect(dry.droughtStressDetected).toBe(true);
    expect(dry.volumetricSoilMoisturePct).toBeLessThan(12.0);
  });

  it("Achievement 5: Decentralized Carbon Offset Double-Counting Cross-Registry Merkle Sieve", () => {
    const retiredSet = new Set<string>();
    // First retirement -> succeeds
    const first = sieveCarbonRetirementNullifier("VCS-10042", "VERRA", retiredSet);
    expect(first.isDoubleCountingDetected).toBe(false);
    retiredSet.add(first.nullifierHash);

    // Attempted duplicate retirement on Gold Standard -> blocked!
    const duplicate = sieveCarbonRetirementNullifier("VCS-10042", "VERRA", retiredSet);
    expect(duplicate.isDoubleCountingDetected).toBe(true);
  });
});
