export interface PeatDomeHydraulicResult {
  drawdownConeRadiusMeters: number;
  seepageFluxM3PerDay: number;
  catotelmIntegrityProtected: boolean;
  mitigationAction: string;
}

export function governPeatDomeCatotelmHydraulics(
  ditchDrainageDepthMeters: number,
  catotelmHydraulicConductivityMPerDay: number = 0.005, // typical catotelm 0.001 - 0.01 m/day
  peatDomeThicknessMeters: number = 4.5
): PeatDomeHydraulicResult {
  if (ditchDrainageDepthMeters <= 0) {
    return { drawdownConeRadiusMeters: 0, seepageFluxM3PerDay: 0, catotelmIntegrityProtected: true, mitigationAction: "NATURAL_STATE_MAINTAINED" };
  }

  // Dupuit-Forchheimer drainage drawdown radius: R ~ 1.5 * sqrt(K * H / recharge)
  // Deeper drainage ditches (>0.8m) cause catastrophic drawdown cone expanding > 150m into pristine peat dome
  const drawdownRadius = Number((ditchDrainageDepthMeters * 180.0 * Math.sqrt(catotelmHydraulicConductivityMPerDay / 0.005)).toFixed(1));
  const seepage = Number((ditchDrainageDepthMeters * catotelmHydraulicConductivityMPerDay * 100.0).toFixed(2));

  const isProtected = ditchDrainageDepthMeters <= 0.40 && drawdownRadius <= 80.0;
  const action = isProtected ? "SAFE_CANAL_BLOCKING_ACTIVE" : "CRITICAL_INSTALL_COMPACTED_PEAT_DAMS";

  return {
    drawdownConeRadiusMeters: drawdownRadius,
    seepageFluxM3PerDay: seepage,
    catotelmIntegrityProtected: isProtected,
    mitigationAction: action,
  };
}
