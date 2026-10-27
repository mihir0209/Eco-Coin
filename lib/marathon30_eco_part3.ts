export function calculateRefrigerantDestructionGwp(refrigerantType: "R134a" | "R410A" | "R404A", kgDestroyed: number): number {
  const GWP_MAP = { R134a: 1430, R410A: 2088, R404A: 3922 };
  const gwp = GWP_MAP[refrigerantType] || 1000;
  return Number(((kgDestroyed * gwp) / 1000.0).toFixed(2));
}

export function calculateRiceAwdMethaneReduction(hectares: number, baselineContinuousFloodingDays: number, dryDrainDays: number): number {
  const reductionPct = Math.min(0.5, (dryDrainDays / Math.max(1, baselineContinuousFloodingDays)) * 0.8);
  const baselineCh4Tons = hectares * 0.3;
  return Number((baselineCh4Tons * reductionPct * 28).toFixed(2));
}

export function calculateClinkerReplacementSavings(totalCementTons: number, pozzolanReplacementPct: number): number {
  const standardEmissionsPerTonClinker = 0.85; // 0.85 tCO2e / ton clinker
  const savedClinkerTons = totalCementTons * (pozzolanReplacementPct / 100.0);
  return Number((savedClinkerTons * standardEmissionsPerTonClinker).toFixed(2));
}

export function calculateFleetEvDisplacement(dieselLitresDisplaced: number): number {
  return Number(((dieselLitresDisplaced * 2.68) / 1000.0).toFixed(2)); // ~2.68 kg CO2/L diesel
}

export function calculateDistrictHeatingRecovery(wasteHeatMwhRecovered: number, naturalGasDisplacementFactor: number = 0.2): number {
  return Number((wasteHeatMwhRecovered * naturalGasDisplacementFactor).toFixed(2));
}

export function calculateGreenHydrogenAbatement(kgH2Produced: number, greyH2EmissionsPerKg: number = 10.0, greenH2EmissionsPerKg: number = 1.0): number {
  const netSavedPerKg = Math.max(0, greyH2EmissionsPerKg - greenH2EmissionsPerKg);
  return Number(((kgH2Produced * netSavedPerKg) / 1000.0).toFixed(2));
}

export function calculateAviationSafBlendedReduction(safGallons: number, lifecycleCo2ReductionPct: number = 75): number {
  const conventionalJetFuelKgPerGal = 9.57;
  const avoidedKg = safGallons * conventionalJetFuelKgPerGal * (lifecycleCo2ReductionPct / 100.0);
  return Number((avoidedKg / 1000.0).toFixed(2));
}

export function calculateMarineSlowSteaming(speedNormalKnots: number, speedSlowKnots: number, distanceNauticalMiles: number): number {
  if (speedSlowKnots >= speedNormalKnots) return 0;
  // Fuel consumption roughly scales with speed cubed
  const ratio = 1 - Math.pow(speedSlowKnots / speedNormalKnots, 2);
  const baselineFuelTons = distanceNauticalMiles * 0.05;
  const savedFuelTons = baselineFuelTons * Math.max(0, ratio);
  return Number((savedFuelTons * 3.11).toFixed(2)); // ~3.11 tCO2/t bunker fuel
}

export function calculateBuildingRetrofitInsulationSavings(hvacKwhBefore: number, hvacKwhAfter: number, gridFactorKgKwh: number = 0.35): number {
  const kwhSaved = Math.max(0, hvacKwhBefore - hvacKwhAfter);
  return Number(((kwhSaved * gridFactorKgKwh) / 1000.0).toFixed(2));
}

export function aggregateScope3Rollup(tier1TCO2e: number, tier2TCO2e: number, tier3TCO2e: number, transportTCO2e: number): { totalScope3TCO2e: number; largestContributor: string } {
  const total = Number((tier1TCO2e + tier2TCO2e + tier3TCO2e + transportTCO2e).toFixed(2));
  const maxVal = Math.max(tier1TCO2e, tier2TCO2e, tier3TCO2e, transportTCO2e);
  let contributor = "TIER_1";
  if (maxVal === tier2TCO2e) contributor = "TIER_2";
  else if (maxVal === tier3TCO2e) contributor = "TIER_3";
  else if (maxVal === transportTCO2e) contributor = "TRANSPORT";
  return { totalScope3TCO2e: total, largestContributor: contributor };
}
