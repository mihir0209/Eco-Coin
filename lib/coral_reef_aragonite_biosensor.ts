export interface CoralCalcificationStatus {
  aragoniteSaturationOmega: number;
  netCalcificationRateGramsCaCo3M2Day: number;
  degreeHeatingWeeksDhw: number;
  bleachingAndCorrosionRisk: "NORMAL_HEALTHY" | "WATCH" | "WARNING_BLEACHING" | "CRITICAL_SKELETON_CORROSION";
}

export function evaluateCoralAragoniteCalcification(
  aragoniteSaturationOmega: number, // typical tropical ocean 3.0 to 4.2
  seaSurfaceTempCelsius: number,
  baselineMaxMonthlyMeanTempC: number = 28.5,
  heatStressDurationWeeks: number = 2.0
): CoralCalcificationStatus {
  // Degree Heating Weeks (DHW) accumulates when SST > (MMM + 1.0 C)
  const heatStressAnomaly = Math.max(0, seaSurfaceTempCelsius - (baselineMaxMonthlyMeanTempC + 1.0));
  const dhw = Number((heatStressAnomaly * heatStressDurationWeeks).toFixed(1));

  // Net calcification G_net = k * (Omega_arag - 1)^n (where k ~ 15 g/m2/d)
  let calcificationRate = 0.0;
  if (aragoniteSaturationOmega > 1.0) {
    calcificationRate = Number((15.0 * Math.pow(aragoniteSaturationOmega - 1.0, 1.2)).toFixed(2));
  } else {
    // Net dissolution when undersaturated (Omega < 1.0)
    calcificationRate = Number((-10.0 * (1.0 - aragoniteSaturationOmega)).toFixed(2));
  }

  let risk: "NORMAL_HEALTHY" | "WATCH" | "WARNING_BLEACHING" | "CRITICAL_SKELETON_CORROSION" = "NORMAL_HEALTHY";
  if (aragoniteSaturationOmega < 1.0 || dhw >= 8.0) {
    risk = "CRITICAL_SKELETON_CORROSION";
  } else if (dhw >= 4.0) {
    risk = "WARNING_BLEACHING";
  } else if (aragoniteSaturationOmega < 2.5 || dhw > 0) {
    risk = "WATCH";
  }

  return {
    aragoniteSaturationOmega,
    netCalcificationRateGramsCaCo3M2Day: calcificationRate,
    degreeHeatingWeeksDhw: dhw,
    bleachingAndCorrosionRisk: risk,
  };
}
