export interface BasaltWeatheringMetrics {
  calciumMagnesiumReleasedMolM3: number;
  inferredCo2DrawnDownTonnes: number;
  soilPhShift: number;
}

export function traceBasaltWeatheringLeachate(
  leachateVolumeLiters: number,
  measuredCaPpm: number,
  measuredMgPpm: number,
  baselineConductivityUsCm: number,
  measuredConductivityUsCm: number
): BasaltWeatheringMetrics {
  if (leachateVolumeLiters <= 0) {
    return { calciumMagnesiumReleasedMolM3: 0, inferredCo2DrawnDownTonnes: 0, soilPhShift: 0 };
  }

  // Atomic weights: Ca = 40.078 g/mol, Mg = 24.305 g/mol
  const caMols = (measuredCaPpm * leachateVolumeLiters) / (40.078 * 1000.0);
  const mgMols = (measuredMgPpm * leachateVolumeLiters) / (24.305 * 1000.0);
  const totalCationsMol = caMols + mgMols;

  // 1 mole of divalent cation (Ca2+ or Mg2+) neutralizes 2 moles of HCO3- (dissolved CO2)
  const co2MolsCaptured = totalCationsMol * 2.0;
  const co2GramsCaptured = co2MolsCaptured * 44.01;
  const co2TonnesCaptured = Number((co2GramsCaptured / 1e6).toFixed(4));

  const conductivityRatio = measuredConductivityUsCm / Math.max(1.0, baselineConductivityUsCm);
  const phShift = Number((Math.log10(Math.max(1.0, conductivityRatio)) * 0.45).toFixed(2));

  return {
    calciumMagnesiumReleasedMolM3: Number((totalCationsMol / (leachateVolumeLiters / 1000.0)).toFixed(2)),
    inferredCo2DrawnDownTonnes: co2TonnesCaptured,
    soilPhShift: phShift,
  };
}
