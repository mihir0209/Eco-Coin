export function invertSatelliteMethanePlume(
  columnExcessMolM2: number,
  windSpeedMetersPerSec: number,
  plumeLengthMeters: number,
  atmosphericMixingLayerMeters: number = 1000.0
): { emissionRateKgPerHour: number; tco2eHourlyPenalty: number; isMajorPointSource: boolean } {
  if (columnExcessMolM2 <= 0 || windSpeedMetersPerSec <= 0 || plumeLengthMeters <= 0) {
    return { emissionRateKgPerHour: 0, tco2eHourlyPenalty: 0, isMajorPointSource: false };
  }
  // Molar mass of CH4 = 0.01604 kg/mol
  // Cross-sectional flux = column_excess * wind_speed * mixing_layer_height * molar_mass
  const massFluxKgPerSec = columnExcessMolM2 * windSpeedMetersPerSec * atmosphericMixingLayerMeters * 0.01604;
  const emissionRateKgPerHour = Number((massFluxKgPerSec * 3600.0).toFixed(2));
  // GWP 28
  const tco2eHourlyPenalty = Number(((emissionRateKgPerHour * 28.0) / 1000.0).toFixed(2));
  const isMajorPointSource = emissionRateKgPerHour >= 500.0; // >500 kg/h is a super-emitter

  return { emissionRateKgPerHour, tco2eHourlyPenalty, isMajorPointSource };
}
