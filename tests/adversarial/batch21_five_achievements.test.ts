import { describe, it, expect } from "vitest";
import { calculateMethaneDigesterAbatement } from "../../lib/methane_capture_router";
import { calculateAgroforestryCarbon } from "../../lib/agroforestry_carbon_model";
import { calculateHeatPumpEmissionsSaved } from "../../lib/heat_pump_offset";
import { calculateMassTimberSubstitutionSavings } from "../../lib/timber_building_substitution";
import { optimizeVirtualPowerPlantDispatch } from "../../lib/virtual_power_plant";

describe("Eco-Coin Batch 21 - 5 Production Achievements", () => {
  it("Achievement 1: Methane Digester Capture Router", () => {
    // 500 m3/day biogas at 60% CH4 for 30 days, 99% flare efficiency
    const saved = calculateMethaneDigesterAbatement(500, 60, 30, 99);
    expect(saved).toBeGreaterThan(100.0);
    expect(calculateMethaneDigesterAbatement(0, 60, 30)).toBe(0);
  });

  it("Achievement 2: Agroforestry Biomass Carbon Model", () => {
    // 50 hectares, 400 trees/ha, 8 years old
    const carbon = calculateAgroforestryCarbon(50, 400, 8, 1.2);
    expect(carbon).toBeGreaterThan(5000);
  });

  it("Achievement 3: Industrial Heat Pump Emission Offset", () => {
    // 1000 MWh heat output with COP 3.5 replacing gas boiler
    const saved = calculateHeatPumpEmissionsSaved(1000, 3.5, 240, 150);
    expect(saved).toBeGreaterThan(150);
    expect(calculateHeatPumpEmissionsSaved(1000, 1.0)).toBe(0);
  });

  it("Achievement 4: Mass Timber Building Substitution Engine", () => {
    // 200 m3 CLT, 150 m3 concrete avoided, 20 tons steel avoided
    const saved = calculateMassTimberSubstitutionSavings(200, 150, 20);
    expect(saved).toBe(180 + 52.5 + 36);
  });

  it("Achievement 5: Virtual Power Plant Battery Dispatch Optimizer", () => {
    const batteries = [50, 75, 100, 40, 60]; // 325 kWh total
    const highStress = optimizeVirtualPowerPlantDispatch(batteries, 0.9);
    expect(highStress.dispatchedKwh).toBe(260); // 80% of 325
    expect(highStress.revenueUsd).toBeGreaterThan(100);
    expect(highStress.carbonGridReductionTons).toBeGreaterThan(0.1);

    const lowStress = optimizeVirtualPowerPlantDispatch(batteries, 0.1);
    expect(lowStress.dispatchedKwh).toBe(0);
  });
});
