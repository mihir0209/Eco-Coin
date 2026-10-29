export interface OceanLimingDispersionMetrics {
  slakedLimeTonnesAdded: number;
  effectiveAlkalinityAddedMol: number;
  surfacePlumeRadiusMeters: number;
  inferredCo2DrawdownTco2e: number;
  surfacePhPeak: number;
}

export function modelOceanLimingSurfacePlume(
  hydratedLimeTonnes: number, // Ca(OH)2
  hoursSinceDispersal: number,
  ambientSurfacePh: number = 8.10,
  eddyDiffusivityM2PerSec: number = 2.0
): OceanLimingDispersionMetrics {
  if (hydratedLimeTonnes <= 0) {
    return { slakedLimeTonnesAdded: 0, effectiveAlkalinityAddedMol: 0, surfacePlumeRadiusMeters: 0, inferredCo2DrawdownTco2e: 0, surfacePhPeak: ambientSurfacePh };
  }

  // Molecular weight Ca(OH)2 = 74.093 g/mol. Each mole releases 2 eq of alkalinity:
  // Ca(OH)2 + 2CO2 -> Ca2+ + 2HCO3-
  const molesCaOh2 = (hydratedLimeTonnes * 1e6) / 74.093;
  const alkalinityAddedEq = molesCaOh2 * 2.0;

  // Stoichiometric CO2 capture: ~1.18 t CO2 per t Ca(OH)2 * ocean buffering factor (~0.85)
  const co2DrawdownTco2e = Number((hydratedLimeTonnes * 1.18 * 0.85).toFixed(2));

  // Radial Gaussian dispersion: radius r ~ sqrt(4 * K * t)
  const tSec = hoursSinceDispersal * 3600.0;
  const radiusMeters = Number(Math.sqrt(Math.max(100.0, 4.0 * eddyDiffusivityM2PerSec * tSec)).toFixed(1));

  // Surface pH spike attenuates as plume expands
  const dilutionFactor = Math.max(1.0, radiusMeters / 10.0);
  const phSpike = (0.60 / dilutionFactor);
  const peakPh = Number((ambientSurfacePh + phSpike).toFixed(2));

  return {
    slakedLimeTonnesAdded: hydratedLimeTonnes,
    effectiveAlkalinityAddedMol: Number(alkalinityAddedEq.toFixed(0)),
    surfacePlumeRadiusMeters: radiusMeters,
    inferredCo2DrawdownTco2e: co2DrawdownTco2e,
    surfacePhPeak: peakPh,
  };
}
