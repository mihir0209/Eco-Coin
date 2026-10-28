export function calculateAgroforestryCarbon(
  hectares: number,
  treesPerHa: number,
  avgAgeYears: number,
  speciesFactor: number = 1.0
): number {
  if (hectares <= 0 || treesPerHa <= 0 || avgAgeYears <= 0) return 0;
  // Annual growth curve saturation
  const biomassPerTreeKg = Math.min(500, avgAgeYears * 25 * speciesFactor);
  const totalBiomassTons = (hectares * treesPerHa * biomassPerTreeKg) / 1000.0;
  // 50% of dry biomass is carbon, 44/12 conversion to CO2
  return Number((totalBiomassTons * 0.5 * (44 / 12)).toFixed(2));
}
