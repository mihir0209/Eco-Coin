import { describe, it, expect } from "vitest";
import { calculateDacThermalEfficiency } from "../../lib/dac_thermal_integration";
import { calculateGeothermalLithiumFootprint } from "../../lib/geothermal_lithium_carbon";
import { calculatePeatlandSubsidenceFlux } from "../../lib/peatland_water_flux";
import { optimizeFleetChargingDispatch } from "../../lib/ev_fleet_smart_charge";
import { calculateAmmoniaMaritimeDisplacement } from "../../lib/green_ammonia_fuel";

describe("Eco-Coin Batch 23 - 5 Production Achievements", () => {
  it("Achievement 1: DAC waste-heat thermal integration and parasitic accounting", () => {
    // 100 tons CO2 captured at 100C with 150 MWh waste heat and 20 MWh parasitic electricity
    const res = calculateDacThermalEfficiency(100, 100, 150, 20, 150);
    expect(res.thermalEfficiencyRatio).toBe(1.0);
    expect(res.parasiticFootprintTons).toBe(3.0); // 20 * 150 / 1000
    expect(res.netCo2CapturedTons).toBe(97.0);

    // Below regen temp threshold
    const cold = calculateDacThermalEfficiency(100, 60, 150, 20);
    expect(cold.netCo2CapturedTons).toBe(0);
  });

  it("Achievement 2: Geothermal DLE lithium co-extraction carbon benefit", () => {
    // 500 tons lithium carbonate produced with 99.8% reinjection efficiency
    const res = calculateGeothermalLithiumFootprint(500, 100, 99.8);
    expect(res.avoidedCo2TonsVsHardRock).toBe(6900.0); // 500 * (15 - 1.2)
    expect(res.brineLossTons).toBeGreaterThan(0);
  });

  it("Achievement 3: Peatland subsidence depth to carbon emission flux", () => {
    // 70 cm drainage depth on 200 hectares peatland
    const flux = calculatePeatlandSubsidenceFlux(70, 200, 85);
    expect(flux.isSevereSubsidence).toBe(true);
    expect(flux.annualSubsidenceCm).toBe(2.8);
    expect(flux.carbonEmissionFluxTco2e).toBeGreaterThan(10000);
  });

  it("Achievement 4: EV fleet smart charging marginal emission factor dispatch", () => {
    // 24 hour emission factors
    const efs = [200, 180, 150, 130, 120, 140, 220, 300, 280, 250, 210, 190, 170, 160, 200, 240, 320, 350, 310, 270, 230, 210, 180, 160];
    const dispatch = optimizeFleetChargingDispatch(20, 400, efs);
    expect(dispatch.optimalHours).toEqual([2, 3, 4, 5]); // Cleanest hours
    expect(dispatch.scheduledKwhPerHour).toBe(100);
    expect(dispatch.totalEstimatedCo2Kg).toBeGreaterThan(0);
  });

  it("Achievement 5: Green ammonia maritime propulsion avoided bunker fuel", () => {
    // 1000 tons ammonia displacing 460 tons bunker fuel (energy parity ~1:2.17)
    const nh3 = calculateAmmoniaMaritimeDisplacement(1000, 460, 0.01);
    expect(nh3.grossAvoidedCo2Tons).toBeCloseTo(1432.44, 1);
    expect(nh3.energyParityGj).toBe(18600.0);
    expect(nh3.netEmissionsSavedTco2e).toBeGreaterThan(1300);
  });
});
