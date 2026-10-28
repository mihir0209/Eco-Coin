import { describe, it, expect } from "vitest";
import { calculateImpermanentLossHedge } from "../../lib/impermanent_loss_vault";
import { evaluateSarSoilMoisture } from "../../lib/sar_soil_moisture";
import { invertSatelliteMethanePlume } from "../../lib/satellite_plume_inversion";
import { compareFreightRouteEmissions } from "../../lib/scope3_freight_optimizer";
import { modelDacTsaDesorption } from "../../lib/dac_tsa_desorption";

describe("Eco-Coin Batch 24 - 5 Production Achievements", () => {
  it("Achievement 1: Dynamic Impermanent Loss Vault calculates insurance payout", () => {
    // 2x price ratio increase (k = 2) -> ~5.72% IL on $10,000 LP liquidity
    const hedge = calculateImpermanentLossHedge(1.0, 2.0, 10000, 50);
    expect(hedge.impermanentLossPct).toBeCloseTo(5.72, 1);
    expect(hedge.lossAmountUsd).toBeGreaterThan(500);
    expect(hedge.payoutUsd).toBeGreaterThan(400); // 80% coverage
    expect(hedge.netLpReturnUsd).toBeGreaterThan(9500);
  });

  it("Achievement 2: Satellite SAR soil moisture & drought risk estimation", () => {
    // Wet soil with high backscatter (-10 dB)
    const wet = evaluateSarSoilMoisture(-10, 40, 1.0);
    expect(wet.volumetricSoilMoisturePct).toBeGreaterThan(20);
    expect(wet.droughtRiskLevel).toBe("OPTIMAL");

    // Parched drought soil with low backscatter (-25 dB)
    const dry = evaluateSarSoilMoisture(-25, 40, 1.0);
    expect(dry.droughtRiskLevel).toBe("SEVERE");
    expect(dry.volumetricSoilMoisturePct).toBeLessThan(10);
  });

  it("Achievement 3: Satellite methane plume flux inversion & super-emitter detection", () => {
    // High column excess: 0.05 mol/m2, wind 5 m/s, mixing layer 1000m
    const plume = invertSatelliteMethanePlume(0.05, 5.0, 2000.0, 1000.0);
    expect(plume.isMajorPointSource).toBe(true);
    expect(plume.emissionRateKgPerHour).toBeGreaterThan(500);
    expect(plume.tco2eHourlyPenalty).toBeGreaterThan(10);
  });

  it("Achievement 4: Scope-3 transport route freight emission mode comparator", () => {
    // 50 tons cargo over 1500 km -> Ocean freight is lowest carbon
    const freightLong = compareFreightRouteEmissions(50, 1500);
    expect(freightLong.recommendedMode).toBe("OCEAN");
    expect(freightLong.avoidedCo2TonsVsRoad).toBeGreaterThan(4.0);

    // 50 tons cargo over 500 km -> Rail freight recommended
    const freightMedium = compareFreightRouteEmissions(50, 500);
    expect(freightMedium.recommendedMode).toBe("RAIL");
  });

  it("Achievement 5: Direct Air Capture TSA desorption thermal model", () => {
    // 10,000 kg sorbent at 100C desorption
    const tsa = modelDacTsaDesorption(10000, 100.0);
    expect(tsa.co2ReleasedKg).toBe(800.0); // 8 wt%
    expect(tsa.thermalEnergyRequiredKwh).toBeGreaterThan(400);
    expect(tsa.thermalIntensityGjPerTon).toBeGreaterThan(2.0);

    // Below 90C fails
    expect(modelDacTsaDesorption(10000, 80.0).co2ReleasedKg).toBe(0);
  });
});
