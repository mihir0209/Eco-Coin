export function assessFugitiveMethaneLeak(
  measuredPpm: number,
  baselineAmbientPpm: number = 1.9,
  flowRateM3PerHour: number = 100.0,
  durationHours: number = 24.0
): { excessCh4Kg: number; tco2ePenalty: number; isActionableLeak: boolean } {
  if (measuredPpm <= baselineAmbientPpm) {
    return { excessCh4Kg: 0, tco2ePenalty: 0, isActionableLeak: false };
  }
  // delta PPM converted to molar fraction
  const deltaPpm = measuredPpm - baselineAmbientPpm;
  const isActionableLeak = deltaPpm >= 10.0; // Significant leak threshold

  // Molar density of CH4 ~0.717 kg/m3 at standard conditions
  const volumeLeakedM3 = (deltaPpm / 1_000_000.0) * flowRateM3PerHour * durationHours;
  const excessCh4Kg = Number((volumeLeakedM3 * 0.717).toFixed(4));
  // GWP of methane = 28
  const tco2ePenalty = Number(((excessCh4Kg * 28.0) / 1000.0).toFixed(4));

  return { excessCh4Kg, tco2ePenalty, isActionableLeak };
}
