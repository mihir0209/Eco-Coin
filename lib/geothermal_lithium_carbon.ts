export function calculateGeothermalLithiumFootprint(
  lithiumCarbonateTons: number,
  brineFlowRateLitersPerSec: number,
  reinjectionEfficiencyPct: number = 99.5
): { avoidedCo2TonsVsHardRock: number; brineLossTons: number; netIntensityKgCo2PerTon: number } {
  if (lithiumCarbonateTons <= 0) {
    return { avoidedCo2TonsVsHardRock: 0, brineLossTons: 0, netIntensityKgCo2PerTon: 0 };
  }
  // Hard-rock spodumene lithium mining emits ~15 tons CO2e per ton LCE
  // Direct Lithium Extraction (DLE) from geothermal brine emits ~1.2 tons CO2e per ton LCE
  const avoidedPerTon = 15.0 - 1.2;
  const avoidedCo2TonsVsHardRock = Number((lithiumCarbonateTons * avoidedPerTon).toFixed(2));

  // Brine reinjection loss
  const lossFraction = (100.0 - reinjectionEfficiencyPct) / 100.0;
  const brineLossTons = Number((brineFlowRateLitersPerSec * 3600 * 24 * 0.001 * lossFraction).toFixed(2));

  return { avoidedCo2TonsVsHardRock, brineLossTons, netIntensityKgCo2PerTon: 1200.0 };
}
