export interface LibsCalibrationResult {
  carbonPeakIntensityC247nm: number;
  electronDensityNeCm3: number;
  calibratedSoilOrganicCarbonPct: number;
  plasmaStabilityRatio: number;
}

export function calibrateSoilCarbonLibsSpectra(
  rawPeakCounts247_86nm: number,
  hAlphaStarkFullWidthHalfMaxNm: number, // Stark broadening of H-alpha 656.3nm
  continuumBackgroundCounts: number
): LibsCalibrationResult {
  if (rawPeakCounts247_86nm <= 0) {
    return { carbonPeakIntensityC247nm: 0, electronDensityNeCm3: 0, calibratedSoilOrganicCarbonPct: 0, plasmaStabilityRatio: 1.0 };
  }

  const netCarbonIntensity = Math.max(0, rawPeakCounts247_86nm - continuumBackgroundCounts);
  const stability = Number((rawPeakCounts247_86nm / Math.max(1.0, continuumBackgroundCounts)).toFixed(2));

  // Plasma electron density n_e from H-alpha Stark FWHM (Griem formulation):
  // n_e = C(N_e, T) * (Delta lambda_FWHM)^1.5 * 1e17 cm^-3
  const fwhm = Math.max(0.1, hAlphaStarkFullWidthHalfMaxNm);
  const ne = Number((1.2e17 * Math.pow(fwhm / 0.5, 1.5)).toFixed(0));

  // Calibration curve: SOC% = a * (I_net / Background) + b
  const socPct = Number((0.45 * stability).toFixed(2));

  return {
    carbonPeakIntensityC247nm: netCarbonIntensity,
    electronDensityNeCm3: Number(ne),
    calibratedSoilOrganicCarbonPct: Math.min(15.0, socPct),
    plasmaStabilityRatio: stability,
  };
}
