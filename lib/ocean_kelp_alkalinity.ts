export function evaluateKelpOceanAlkalinity(
  harvestedDryBiomassTons: number,
  sequestrationDepthMeters: number,
  aragSaturationState: number // Ocean aragonite saturation Omega
): { sequesteredCarbonTco2e: number; oceanAcidificationReliefIndex: number; isPermanentlySequestered: boolean } {
  // Sinking below 1000m (bathypelagic) ensures multi-century permanence
  const isPermanentlySequestered = sequestrationDepthMeters >= 1000;
  if (!isPermanentlySequestered || harvestedDryBiomassTons <= 0) {
    return { sequesteredCarbonTco2e: 0, oceanAcidificationReliefIndex: 0, isPermanentlySequestered: false };
  }
  // 35% of dry biomass is carbon, multiplied by 44/12 for CO2
  const sequesteredCarbonTco2e = Number((harvestedDryBiomassTons * 0.35 * (44.0 / 12.0)).toFixed(2));
  // Relief index increases when background saturation is low (acidified waters)
  const oceanAcidificationReliefIndex = Number((Math.max(0.1, 4.0 - aragSaturationState) * 2.5).toFixed(2));

  return { sequesteredCarbonTco2e, oceanAcidificationReliefIndex, isPermanentlySequestered };
}
