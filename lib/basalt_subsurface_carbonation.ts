export interface SubsurfaceCarbonationTelemetry {
  injectedDissolvedCo2Tonnes: number;
  precipitatedMineralCarbonTonnes: number;
  permeabilityReductionPct: number;
  poreThroatCloggingAlert: boolean;
}

export function monitorSubsurfaceBasaltCarbonation(
  co2WaterSolutionInjectedM3: number,
  co2DissolvedGramsPerLiter: number = 30.0, // typical ~30 g CO2 / L at 25 bar
  elapsedDays: number = 180,
  initialPermeabilityMilliDarcy: number = 250.0,
  currentPermeabilityMilliDarcy: number = 190.0
): SubsurfaceCarbonationTelemetry {
  if (co2WaterSolutionInjectedM3 <= 0 || initialPermeabilityMilliDarcy <= 0) {
    return {
      injectedDissolvedCo2Tonnes: 0,
      precipitatedMineralCarbonTonnes: 0,
      permeabilityReductionPct: 0,
      poreThroatCloggingAlert: false,
    };
  }

  const injectedCo2Kg = (co2WaterSolutionInjectedM3 * 1000.0 * co2DissolvedGramsPerLiter) / 1000.0;
  const injectedTonnes = Number((injectedCo2Kg / 1000.0).toFixed(2));

  // In basalt formations (e.g. CarbFix), ~95% of dissolved CO2 mineralizes within 2 years (730 days)
  const mineralizationFraction = Math.min(0.95, (elapsedDays / 730.0) * 0.95);
  const precipitatedTonnes = Number((injectedTonnes * mineralizationFraction).toFixed(2));

  const permDrop = (initialPermeabilityMilliDarcy - currentPermeabilityMilliDarcy) / initialPermeabilityMilliDarcy;
  const permDropPct = Number((permDrop * 100.0).toFixed(1));

  // Clogging alert triggered if permeability drops by > 40%
  const clogging = permDropPct >= 40.0;

  return {
    injectedDissolvedCo2Tonnes: injectedTonnes,
    precipitatedMineralCarbonTonnes: precipitatedTonnes,
    permeabilityReductionPct: permDropPct,
    poreThroatCloggingAlert: clogging,
  };
}
