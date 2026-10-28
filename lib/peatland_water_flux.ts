export function calculatePeatlandSubsidenceFlux(
  drainageDepthCm: number,
  peatAreaHectares: number,
  organicContentPct: number = 85.0
): { annualSubsidenceCm: number; carbonEmissionFluxTco2e: number; isSevereSubsidence: boolean } {
  if (drainageDepthCm <= 0 || peatAreaHectares <= 0) {
    return { annualSubsidenceCm: 0, carbonEmissionFluxTco2e: 0, isSevereSubsidence: false };
  }
  // Empirical tropical/temperate peatland subsidence: ~0.04 cm per cm of drainage depth
  const annualSubsidenceCm = Number((drainageDepthCm * 0.04).toFixed(2));
  // Emissions scale roughly at ~0.9 tCO2e / ha / cm drainage depth / year
  const emissionFactor = 0.9 * (organicContentPct / 100.0);
  const carbonEmissionFluxTco2e = Number((drainageDepthCm * peatAreaHectares * emissionFactor).toFixed(2));
  const isSevereSubsidence = drainageDepthCm >= 60.0;

  return { annualSubsidenceCm, carbonEmissionFluxTco2e, isSevereSubsidence };
}
