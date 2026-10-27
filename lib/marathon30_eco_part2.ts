export function calculateRotationalGrazingOffset(hectares: number, animalUnits: number): number {
  const sequestrationRatePerHa = animalUnits <= (hectares * 1.5) ? 1.2 : 0.0;
  return Number((hectares * sequestrationRatePerHa).toFixed(2));
}

export function calculateSilvopastureOffset(hectares: number, treeCanopyCoveragePct: number): number {
  const baseRate = 2.5;
  const coverageFactor = Math.min(1.0, treeCanopyCoveragePct / 50.0);
  return Number((hectares * baseRate * coverageFactor).toFixed(2));
}

export function calculateUrbanMicroforestSavings(treeCount: number, coolingKwhSavingsPerTree: number): number {
  const totalKwh = treeCount * coolingKwhSavingsPerTree;
  return Number(((totalKwh * 0.4) / 1000.0).toFixed(2)); // 0.4 kg CO2e per kWh
}

export function calculatePeatlandRewettingReduction(hectares: number, waterTableDepthCm: number): number {
  // Higher water table (near 0 cm) reduces oxidation emissions dramatically
  const abatementFactor = Math.max(0, (50 - waterTableDepthCm) * 0.5);
  return Number((hectares * abatementFactor).toFixed(2));
}

export function calculateBeccsNetCapture(biomassEnergyMwh: number, carbonCaptureRatePct: number): number {
  const rawCo2Tons = biomassEnergyMwh * 0.35;
  return Number((rawCo2Tons * (carbonCaptureRatePct / 100)).toFixed(2));
}

export function calculateKelpDeepSeaSequestration(wetKelpHarvestTons: number, sinkingDepthMeters: number): number {
  if (sinkingDepthMeters < 1000) return 0; // Permanence requires bathypelagic depth > 1000m
  const dryCarbonFactor = 0.08;
  return Number((wetKelpHarvestTons * dryCarbonFactor * (44 / 12)).toFixed(2));
}

export function calculateCookstoveFuelReduction(woodSavedKgPerDay: number, daysActive: number): number {
  const totalWoodKg = woodSavedKgPerDay * daysActive;
  return Number(((totalWoodKg * 1.8) / 1000.0).toFixed(2)); // ~1.8 kg CO2e per kg dry wood
}

export function calculateLandfillGasFlaringReduction(methaneScfm: number, hoursRun: number, destructionEfficiency: number = 0.98): number {
  // 1 scfm CH4 = ~0.0192 kg CH4/min
  const ch4Kg = methaneScfm * 0.0192 * (hoursRun * 60) * destructionEfficiency;
  return Number(((ch4Kg * 28) / 1000.0).toFixed(2));
}

export function calculateWastewaterAerationSavings(unmanagedBODKg: number, aerobicTreatmentBODKg: number): number {
  const avoidedCh4Kg = Math.max(0, unmanagedBODKg - aerobicTreatmentBODKg) * 0.25;
  return Number(((avoidedCh4Kg * 28) / 1000.0).toFixed(2));
}

export function calculateDairyDigesterBiogasAvoidance(headOfCattle: number, daysCollected: number): number {
  const ch4KgPerHeadPerDay = 0.8;
  const totalCh4Kg = headOfCattle * ch4KgPerHeadPerDay * daysCollected;
  return Number(((totalCh4Kg * 28) / 1000.0).toFixed(2));
}
