export interface FreightModeComparison {
  roadTco2e: number;
  railTco2e: number;
  oceanTco2e: number;
  recommendedMode: "ROAD" | "RAIL" | "OCEAN";
  avoidedCo2TonsVsRoad: number;
}

export function compareFreightRouteEmissions(
  cargoTons: number,
  distanceKm: number
): FreightModeComparison {
  // Emission factors in grams CO2 per ton-km:
  // Road (Diesel truck): ~80 g/t-km
  // Rail (Electric/diesel freight): ~25 g/t-km
  // Ocean (Container vessel): ~12 g/t-km
  const roadTco2e = Number(((cargoTons * distanceKm * 80.0) / 1_000_000.0).toFixed(2));
  const railTco2e = Number(((cargoTons * distanceKm * 25.0) / 1_000_000.0).toFixed(2));
  const oceanTco2e = Number(((cargoTons * distanceKm * 12.0) / 1_000_000.0).toFixed(2));

  const recommendedMode = distanceKm > 1000 ? "OCEAN" : (distanceKm > 300 ? "RAIL" : "ROAD");
  const chosenEmission = recommendedMode === "OCEAN" ? oceanTco2e : (recommendedMode === "RAIL" ? railTco2e : roadTco2e);
  const avoidedCo2TonsVsRoad = Number(Math.max(0, roadTco2e - chosenEmission).toFixed(2));

  return { roadTco2e, railTco2e, oceanTco2e, recommendedMode, avoidedCo2TonsVsRoad };
}
