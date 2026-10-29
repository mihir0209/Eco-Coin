export interface DacLiquidKohMetrics {
  ambientAirFlowM3PerSec: number;
  co2CapturedKgPerHour: number;
  potassiumCarbonateFormedKgPerHour: number;
  causticizationEfficiencyPct: number;
  contactorPressureDropPa: number;
}

export function modelDacLiquidKohAbsorption(
  ambientAirFlowM3PerSec: number,
  ambientCo2Ppm: number = 420.0,
  kohSolutionConcentrationMolar: number = 2.0, // 2M KOH (~11.2 wt%)
  contactorPackingHeightMeters: number = 6.0
): DacLiquidKohMetrics {
  if (ambientAirFlowM3PerSec <= 0 || ambientCo2Ppm <= 0) {
    return { ambientAirFlowM3PerSec: 0, co2CapturedKgPerHour: 0, potassiumCarbonateFormedKgPerHour: 0, causticizationEfficiencyPct: 0, contactorPressureDropPa: 0 };
  }

  // Air density ~1.2 kg/m3. 1 ppm CO2 ~ 1.8e-6 kg CO2/m3
  const co2InletKgPerSec = ambientAirFlowM3PerSec * (ambientCo2Ppm * 1.8e-6);
  // Reaction: 2KOH + CO2 -> K2CO3 + H2O
  // Typical mass transfer removal efficiency in packed column with 2M KOH: ~75% to 85%
  const removalEfficiency = Math.min(0.90, 0.75 + (contactorPackingHeightMeters / 10.0) * 0.15);
  const co2CapturedKgPerSec = co2InletKgPerSec * removalEfficiency;
  const co2CapturedKgPerHour = Number((co2CapturedKgPerSec * 3600.0).toFixed(2));

  // Molecular weights: CO2 = 44.01 g/mol, K2CO3 = 138.205 g/mol
  // Mass K2CO3 = Mass CO2 * (138.205 / 44.01) = Mass CO2 * 3.140
  const k2co3KgPerHour = Number((co2CapturedKgPerHour * 3.14).toFixed(2));

  // Structured packing pressure drop ~30-50 Pa per meter
  const pressureDrop = Math.round(contactorPackingHeightMeters * 40.0);

  return {
    ambientAirFlowM3PerSec,
    co2CapturedKgPerHour,
    potassiumCarbonateFormedKgPerHour: k2co3KgPerHour,
    causticizationEfficiencyPct: Number((removalEfficiency * 100.0).toFixed(1)),
    contactorPressureDropPa: pressureDrop,
  };
}
