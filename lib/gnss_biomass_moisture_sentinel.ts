export interface GnssMoistureStatus {
  soilDielectricPermittivity: number;
  volumetricSoilMoisturePct: number;
  canopyBiomassWaterContentKgM2: number;
  droughtStressDetected: boolean;
}

export function invertGnssReflectometryMoisture(
  interferometricSnrNotchDepthDb: number, // typical 4 to 20 dB
  bistaticPhaseDelayNanosec: number
): GnssMoistureStatus {
  // Topp's equation relates apparent dielectric constant epsilon to volumetric moisture
  // Higher soil moisture increases surface reflectivity and SNR notch amplitude
  const epsilon = Math.max(3.0, Number((3.0 + (interferometricSnrNotchDepthDb * 1.8)).toFixed(2)));
  // Topp: VWC = -0.053 + 0.0292*eps - 5.5e-4*eps^2 + 4.3e-6*eps^3
  const vwc = Number(((-0.053 + 0.0292 * epsilon - 0.00055 * Math.pow(epsilon, 2) + 0.0000043 * Math.pow(epsilon, 3)) * 100.0).toFixed(1));
  const biomassWaterKgM2 = Number((bistaticPhaseDelayNanosec * 0.85).toFixed(2));

  const isDrought = vwc <= 12.0;

  return {
    soilDielectricPermittivity: epsilon,
    volumetricSoilMoisturePct: Math.max(0, vwc),
    canopyBiomassWaterContentKgM2: biomassWaterKgM2,
    droughtStressDetected: isDrought,
  };
}
