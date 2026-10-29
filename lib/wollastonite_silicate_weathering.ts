export interface WollastoniteWeatheringMetrics {
  calciumIonsReleasedMolPerM3: number;
  netCo2CaptureTonnes: number;
  silicaConcentrationMgPerL: number;
  dissolutionHalfLifeDays: number;
}

export function traceWollastoniteWeathering(
  wollastoniteAppliedTonnes: number, // CaSiO3
  rainfallVolumeLiters: number,
  soilWaterPh: number = 6.2,
  grainSizeD50Microns: number = 30.0
): WollastoniteWeatheringMetrics {
  if (wollastoniteAppliedTonnes <= 0 || rainfallVolumeLiters <= 0) {
    return { calciumIonsReleasedMolPerM3: 0, netCo2CaptureTonnes: 0, silicaConcentrationMgPerL: 0, dissolutionHalfLifeDays: 9999 };
  }

  // Stoichiometry: CaSiO3 + 2CO2 + H2O -> Ca2+ + 2HCO3- + SiO2
  // Molecular weight CaSiO3 = 116.16 g/mol
  // 1 tonne CaSiO3 captures 0.758 tonnes CO2 theoretically
  const dissolutionRatePerYear = Math.min(0.60, 0.25 * (6.5 / Math.max(4.0, soilWaterPh)) * (50.0 / Math.max(10.0, grainSizeD50Microns)));
  const dissolvedTonnes = wollastoniteAppliedTonnes * dissolutionRatePerYear;
  const netCo2Captured = Number((dissolvedTonnes * 0.758).toFixed(2));

  const molesCa = (dissolvedTonnes * 1e6) / 116.16;
  const caMolsPerM3 = Number((molesCa / (rainfallVolumeLiters / 1000.0)).toFixed(3));
  const silicaPpm = Number(((molesCa * 60.08 * 1000.0) / rainfallVolumeLiters).toFixed(2)); // SiO2 = 60.08 g/mol

  const halfLife = Math.round((0.693 / dissolutionRatePerYear) * 365.0);

  return {
    calciumIonsReleasedMolPerM3: caMolsPerM3,
    netCo2CaptureTonnes: netCo2Captured,
    silicaConcentrationMgPerL: silicaPpm,
    dissolutionHalfLifeDays: halfLife,
  };
}
