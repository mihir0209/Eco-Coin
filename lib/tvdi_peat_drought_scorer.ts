export interface TvdiDroughtAssessment {
  temperatureVegetationDrynessIndex: number;
  droughtSeverityCategory: "WET_OPTIMAL" | "MILD_DROUGHT" | "SEVERE_FIRE_RISK";
  peatIgnitionProbabilityPct: number;
  waterManagementRecommendation: string;
}

export function computeTvdiPeatDroughtIndex(
  landSurfaceTempCelsius: number,
  normalizedDifferenceVegetationIndexNdvi: number,
  tsMinWetEdgeCelsius: number = 22.0,
  tsMaxDryEdgeCelsius: number = 38.0
): TvdiDroughtAssessment {
  if (tsMaxDryEdgeCelsius <= tsMinWetEdgeCelsius) {
    return { temperatureVegetationDrynessIndex: 0.5, droughtSeverityCategory: "MILD_DROUGHT", peatIgnitionProbabilityPct: 20.0, waterManagementRecommendation: "NORMAL" };
  }

  // TVDI = (Ts - Ts_min) / (Ts_max - Ts_min)
  const rawTvdi = (landSurfaceTempCelsius - tsMinWetEdgeCelsius) / (tsMaxDryEdgeCelsius - tsMinWetEdgeCelsius);
  const tvdi = Number(Math.max(0.0, Math.min(1.0, rawTvdi)).toFixed(2));

  let category: "WET_OPTIMAL" | "MILD_DROUGHT" | "SEVERE_FIRE_RISK" = "WET_OPTIMAL";
  let fireProb = 5.0;
  let rec = "NORMAL_WATER_LEVELS";

  if (tvdi >= 0.75) {
    category = "SEVERE_FIRE_RISK";
    fireProb = Math.min(95.0, Number((tvdi * 100.0).toFixed(1)));
    rec = "CRITICAL_OPEN_CANAL_BLOCKING_GATES_IMMEDIATELY";
  } else if (tvdi >= 0.45) {
    category = "MILD_DROUGHT";
    fireProb = 35.0;
    rec = "MONITOR_PIEZOMETER_WELLS_CLOSELY";
  }

  return {
    temperatureVegetationDrynessIndex: tvdi,
    droughtSeverityCategory: category,
    peatIgnitionProbabilityPct: fireProb,
    waterManagementRecommendation: rec,
  };
}
