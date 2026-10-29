export interface SeagrassSequestrationResult {
  annualRhizomeCarbonAccumulationTco2ePerHa: number;
  sedimentMatThicknessCm: number;
  millennialPermanenceScore: number;
  isMeadowHealthy: boolean;
}

export function modelSeagrassMeadowCarbonStock(
  areaHectares: number,
  canopyDensityShootsPerM2: number, // typical 400 - 1500 shoots/m2
  sedimentMatThicknessCm: number = 50.0,
  waterClaritySecchiDepthMeters: number = 4.5
): SeagrassSequestrationResult {
  if (areaHectares <= 0 || canopyDensityShootsPerM2 <= 0) {
    return { annualRhizomeCarbonAccumulationTco2ePerHa: 0, sedimentMatThicknessCm: 0, millennialPermanenceScore: 0, isMeadowHealthy: false };
  }

  // Seagrass meadows (Posidonia, Zostera) accumulate refractory fibrous rhizome mats (mattes)
  // Accumulation rate ~0.8 to 1.5 t C / ha / yr
  const densityFactor = Math.min(1.8, Math.max(0.4, canopyDensityShootsPerM2 / 800.0));
  const clarityFactor = Math.min(1.3, waterClaritySecchiDepthMeters / 3.0);

  const carbonAccumulationTonsPerHa = 1.10 * densityFactor * clarityFactor;
  const co2ePerHa = Number((carbonAccumulationTonsPerHa * (44.0 / 12.0)).toFixed(2));

  // Mat thickness > 30cm indicates centuries of undisturbed sequestration
  const permanenceScore = Math.min(1.0, sedimentMatThicknessCm / 60.0);
  const isHealthy = canopyDensityShootsPerM2 >= 500 && waterClaritySecchiDepthMeters >= 2.5;

  return {
    annualRhizomeCarbonAccumulationTco2ePerHa: co2ePerHa,
    sedimentMatThicknessCm,
    millennialPermanenceScore: Number(permanenceScore.toFixed(2)),
    isMeadowHealthy: isHealthy,
  };
}
