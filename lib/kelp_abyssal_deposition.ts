export interface KelpDepositionResult {
  isPermanentlySequestered: boolean;
  sinkingVelocityMetersPerDay: number;
  sequesteredCo2Tonnes: number;
  refractoryCarbonFraction: number;
}

export function evaluateKelpAbyssalDeposition(
  harvestedWetKelpTonnes: number,
  deploymentDepthMeters: number,
  benthicAnoxicConfirmed: boolean,
  baleDensityKgPerM3: number = 1080.0 // Dense baling exceeds seawater density (~1025 kg/m3)
): KelpDepositionResult {
  if (harvestedWetKelpTonnes <= 0 || deploymentDepthMeters < 1000.0) {
    return {
      isPermanentlySequestered: false,
      sinkingVelocityMetersPerDay: 0,
      sequesteredCo2Tonnes: 0,
      refractoryCarbonFraction: 0,
    };
  }

  // Sinking velocity based on negative buoyancy excess density
  const excessDensity = Math.max(10, baleDensityKgPerM3 - 1025.0);
  const sinkingVelocityMetersPerDay = Number((excessDensity * 4.5).toFixed(1)); // ~247 m/day

  // Dry biomass is ~12% of wet kelp; carbon content is ~30% of dry biomass
  const dryBiomassTonnes = harvestedWetKelpTonnes * 0.12;
  const totalCarbonTonnes = dryBiomassTonnes * 0.30;

  // In abyssal depths (>1000m) with confirmed anoxic sediments, ~85% of carbon remains refractory
  const refractoryFraction = benthicAnoxicConfirmed ? 0.85 : 0.60;
  const sequesteredCarbonTonnes = totalCarbonTonnes * refractoryFraction;
  const sequesteredCo2Tonnes = Number((sequesteredCarbonTonnes * (44.0 / 12.0)).toFixed(2));

  return {
    isPermanentlySequestered: true,
    sinkingVelocityMetersPerDay,
    sequesteredCo2Tonnes,
    refractoryCarbonFraction: refractoryFraction,
  };
}
