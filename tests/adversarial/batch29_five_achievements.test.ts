import { describe, it, expect } from "vitest";
import { calculateMangroveBlueCarbonStock } from "../../lib/mangrove_blue_carbon";
import { evaluateBiocharStability } from "../../lib/biochar_aromaticity_index";
import { monitorSubsurfaceBasaltCarbonation } from "../../lib/basalt_subsurface_carbonation";
import { evaluateCarbonCdpVault } from "../../lib/carbon_cdp_vault";
import { evaluateMarineAcousticSafety } from "../../lib/marine_hydrophone_sentinel";

describe("Eco-Coin Batch 29 - 5 Production Achievements", () => {
  it("Achievement 1: Mangrove Blue Carbon Sediment Accretion & Below-Ground Biomass Model", () => {
    // 100 hectares with 3.0 mm/yr accretion and 120 t/ha root biomass
    const stock = calculateMangroveBlueCarbonStock(100, 3.0, 0.45, 0.10, 120.0);
    expect(stock.accretionPermanenceVerified).toBe(true);
    expect(stock.annualSoilAccretionTco2ePerHectare).toBeGreaterThan(4.0);
    expect(stock.belowGroundBiomassTco2ePerHectare).toBeGreaterThan(150.0);
    expect(stock.totalCarbonStockTco2ePerHectare).toBeGreaterThan(200.0);

    // SAR = 0 fails permanence
    expect(calculateMangroveBlueCarbonStock(100, 0).accretionPermanenceVerified).toBe(false);
  });

  it("Achievement 2: Pyrogenic Carbon Biochar Stable Pyrolysis Aromaticity Index H/Corg Verifier", () => {
    // High-temp 650C biochar: H = 1.8%, Corg = 80% -> H/Corg = (1.8/1.008)/(80/12.011) ~ 0.268 <= 0.40
    const premium = evaluateBiocharStability(1.8, 80.0, 650);
    expect(premium.isEbcCertifiedPermanent).toBe(true);
    expect(premium.permanenceTier).toBe("PERMANENT_MILLENNIAL");
    expect(premium.estimatedSoilHalfLifeYears).toBe(2000);

    // Incomplete pyrolysis H = 6.0%, Corg = 65% -> H/Corg > 0.70
    const bad = evaluateBiocharStability(6.0, 65.0, 350);
    expect(bad.isEbcCertifiedPermanent).toBe(false);
    expect(bad.permanenceTier).not.toBe("PERMANENT_MILLENNIAL");
  });

  it("Achievement 3: Subsurface Mineral Carbonation In-Situ Basalt Pore Clogging Telemetry", () => {
    // 10,000 m3 solution at 30 g/L injected 180 days ago
    const telemetry = monitorSubsurfaceBasaltCarbonation(10000, 30.0, 180, 250.0, 190.0);
    expect(telemetry.injectedDissolvedCo2Tonnes).toBe(300.0);
    expect(telemetry.precipitatedMineralCarbonTonnes).toBeGreaterThan(60.0);
    expect(telemetry.permeabilityReductionPct).toBe(24.0);
    expect(telemetry.poreThroatCloggingAlert).toBe(false);

    // Severe pore throat clogging (> 40% perm drop)
    const clogged = monitorSubsurfaceBasaltCarbonation(10000, 30.0, 365, 250.0, 120.0);
    expect(clogged.poreThroatCloggingAlert).toBe(true);
  });

  it("Achievement 4: Dynamic Carbon Forward Offtake Collateralized Debt Position Vault", () => {
    // 10,000 tCO2e forward vintage 2 years out, $30 spot price, $100k debt
    const vault = evaluateCarbonCdpVault(10000, 30.0, 100000, 2, 65.0);
    // Haircut = 1.0 - 0.10 = 0.90 -> effective price $27 -> Collateral = $270,000
    expect(vault.collateralValueUsd).toBe(270000.0);
    expect(vault.maxBorrowableUsd).toBe(175500.0); // 65% of 270k
    expect(vault.currentLtvPct).toBeLessThan(40.0);
    expect(vault.liquidationRiskTier).toBe("SAFE");

    // Over-leveraged position (LTV >= 80%) triggers liquidation alert
    const underwater = evaluateCarbonCdpVault(10000, 30.0, 230000, 2, 65.0);
    expect(underwater.liquidationRiskTier).toBe("LIQUIDATION_ELIGIBLE");
  });

  it("Achievement 5: Marine Hydrophone Acoustic Pressure Level Marine Mammal Sentinel", () => {
    // 50,000 uPa acoustic pressure at 4000m distance -> SPL = 20 * log10(50000) ~ 94 dB
    const safe = evaluateMarineAcousticSafety(50000, 85.0, 4000.0);
    expect(safe.measuredSplDb).toBe(94.0);
    expect(safe.isCetaceanExclusionZoneBreached).toBe(false);
    expect(safe.mitigationAction).toBe("PROCEED_DISPERSAL");

    // Whale enters 800m exclusion zone or impulsive sound >= 160 dB
    const breach = evaluateMarineAcousticSafety(2000000, 85.0, 800.0); // 2e6 uPa ~ 126 dB
    expect(breach.isCetaceanExclusionZoneBreached).toBe(true);
    expect(breach.mitigationAction).toBe("EMERGENCY_SHUTDOWN");
  });
});
