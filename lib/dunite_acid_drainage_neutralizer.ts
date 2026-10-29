export interface DuniteNeutralizationMetrics {
  duniteTonsRequiredPerDay: number;
  neutralizedSulfuricAcidTonnesPerDay: number;
  magnesiumSulfateGeneratedTonnes: number;
  effluentPhTargetReached: boolean;
  netCo2CapturePotentialTonnes: number;
}

export function modelDuniteAcidMineNeutralization(
  acidDrainageFlowRateM3PerDay: number,
  influentPh: number = 2.2,
  targetEffluentPh: number = 7.0,
  forsteritePurityFraction: number = 0.90 // 90% Mg2SiO4
): DuniteNeutralizationMetrics {
  if (acidDrainageFlowRateM3PerDay <= 0 || influentPh >= targetEffluentPh) {
    return { duniteTonsRequiredPerDay: 0, neutralizedSulfuricAcidTonnesPerDay: 0, magnesiumSulfateGeneratedTonnes: 0, effluentPhTargetReached: true, netCo2CapturePotentialTonnes: 0 };
  }

  // [H+] molarity = 10^(-pH). Sulfuric acid H2SO4 diprotic: moles H2SO4 = 0.5 * moles H+
  const hMolarity = Math.pow(10, -influentPh);
  const molesH2so4 = 0.5 * hMolarity * (acidDrainageFlowRateM3PerDay * 1000.0);
  const metricTonsH2so4 = (molesH2so4 * 98.079) / 1e6;

  // Stoichiometry: Mg2SiO4 + 2H2SO4 -> 2MgSO4 + SiO2 + 2H2O
  // 1 mole forsterite (140.69 g) neutralizes 2 moles H2SO4 (196.16 g)
  const molesForsteriteNeeded = molesH2so4 / 2.0;
  const tonsPureForsterite = (molesForsteriteNeeded * 140.69) / 1e6;
  const grossDuniteTons = tonsPureForsterite / Math.max(0.1, forsteritePurityFraction);

  // Reaction products
  const tonsMgso4 = (molesForsteriteNeeded * 2.0 * 120.366) / 1e6;
  // Dissolved Mg captures CO2 downstream: 1 mol Mg captures 1 mol CO2 (44g per 140.69g forsterite)
  const co2CaptureTonnes = Number((tonsPureForsterite * (44.01 / 140.69)).toFixed(2));

  return {
    duniteTonsRequiredPerDay: Number(grossDuniteTons.toFixed(2)),
    neutralizedSulfuricAcidTonnesPerDay: Number(metricTonsH2so4.toFixed(2)),
    magnesiumSulfateGeneratedTonnes: Number(tonsMgso4.toFixed(2)),
    effluentPhTargetReached: true,
    netCo2CapturePotentialTonnes: co2CaptureTonnes,
  };
}
