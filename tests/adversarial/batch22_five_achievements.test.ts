import { describe, it, expect } from "vitest";
import { calculateBatteryRecyclingOffset } from "../../lib/battery_recycling_offset";
import { assessFugitiveMethaneLeak } from "../../lib/fugitive_methane_leak";
import { calculateBioLngDisplacement } from "../../lib/biomethane_liquefaction_model";
import { evaluateKelpOceanAlkalinity } from "../../lib/ocean_kelp_alkalinity";
import { calculateCbamBorderAdjustmentV2 } from "../../lib/cbam_border_adjustment_v2";

describe("Eco-Coin Batch 22 - 5 Production Achievements", () => {
  it("Achievement 1: Battery closed-loop recycling avoided mining emissions", () => {
    // 500kg battery pack with 10kg Li, 30kg Ni, 10kg Co, 95% efficiency
    const res = calculateBatteryRecyclingOffset(500, 10, 30, 10, 95);
    expect(res.recoveredLithiumKg).toBe(9.5);
    expect(res.recoveredNickelKg).toBe(28.5);
    expect(res.recoveredCobaltKg).toBe(9.5);
    // 9.5*15 + 28.5*18 + 9.5*25 = 142.5 + 513 + 237.5 = 893
    expect(res.avoidedCo2Kg).toBe(893);
  });

  it("Achievement 2: Fugitive methane leak laser detection & carbon penalty", () => {
    // Measured 25 PPM vs baseline 1.9 PPM -> delta 23.1 PPM (Actionable leak)
    const leak = assessFugitiveMethaneLeak(25.0, 1.9, 1000.0, 48.0);
    expect(leak.isActionableLeak).toBe(true);
    expect(leak.excessCh4Kg).toBeGreaterThan(0.5);
    expect(leak.tco2ePenalty).toBeGreaterThan(0.01);
  });

  it("Achievement 3: Bio-LNG maritime fuel displacement and cryogenic footprint", () => {
    // 100 tons Bio-LNG displacing diesel with 350 kWh/t liquefaction
    const bio = calculateBioLngDisplacement(100, 350, 0.25);
    expect(bio.grossDieselReplacedLiters).toBe(140000);
    expect(bio.netEmissionSavingsTco2e).toBeGreaterThan(300);
  });

  it("Achievement 4: Deep ocean kelp bathypelagic sinking & alkalinity index", () => {
    // 500 tons dry kelp sank to 1500m depth with low Omega aragonite (1.5)
    const ocean = evaluateKelpOceanAlkalinity(500, 1500, 1.5);
    expect(ocean.isPermanentlySequestered).toBe(true);
    expect(ocean.sequesteredCarbonTco2e).toBeGreaterThan(600);
    expect(ocean.oceanAcidificationReliefIndex).toBe(6.25);

    // Shallow sinking (<1000m) is rejected
    const shallow = evaluateKelpOceanAlkalinity(500, 800, 1.5);
    expect(shallow.isPermanentlySequestered).toBe(false);
    expect(shallow.sequesteredCarbonTco2e).toBe(0);
  });

  it("Achievement 5: CBAM border carbon tariff v2 with EU ETS benchmark & origin credit", () => {
    // 1000 tons steel, intensity 2.2 tCO2/t vs EU benchmark 1.4 tCO2/t -> 0.8 excess/t = 800 tCO2
    // EU price €85/t, origin carbon tax paid €35/t
    const cbam = calculateCbamBorderAdjustmentV2(1000, 2.2, 1.4, 85, 35);
    expect(cbam.isBenchmarkCompliant).toBe(false);
    expect(cbam.creditGrantedEur).toBe(28000); // 800 * 35
    expect(cbam.netCbamPayableEur).toBe(40000); // 800 * (85 - 35)

    // Benchmark compliant product pays 0
    const clean = calculateCbamBorderAdjustmentV2(1000, 1.2, 1.4, 85, 0);
    expect(clean.isBenchmarkCompliant).toBe(true);
    expect(clean.netCbamPayableEur).toBe(0);
  });
});
