export function calculateAmmoniaMaritimeDisplacement(
  greenAmmoniaTons: number,
  bunkerFuelReplacedTons: number,
  renewablePowerFactorKgKwh: number = 0.02
): { grossAvoidedCo2Tons: number; netEmissionsSavedTco2e: number; energyParityGj: number } {
  if (greenAmmoniaTons <= 0) {
    return { grossAvoidedCo2Tons: 0, netEmissionsSavedTco2e: 0, energyParityGj: 0 };
  }
  // Heavy fuel oil (HFO) emissions: ~3.114 tCO2 per ton fuel
  const grossAvoidedCo2Tons = Number((bunkerFuelReplacedTons * 3.114).toFixed(2));
  // Ammonia energy density ~18.6 GJ/ton vs HFO ~40.4 GJ/ton
  const energyParityGj = Number((greenAmmoniaTons * 18.6).toFixed(1));
  // Synthesis electricity footprint (electrolysis + Haber-Bosch: ~10 MWh/ton NH3)
  const parasiticFootprint = (greenAmmoniaTons * 10.0 * 1000.0 * renewablePowerFactorKgKwh) / 1000.0;
  const netEmissionsSavedTco2e = Number(Math.max(0, grossAvoidedCo2Tons - parasiticFootprint).toFixed(2));

  return { grossAvoidedCo2Tons, netEmissionsSavedTco2e, energyParityGj };
}
