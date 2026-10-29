export interface PeatlandRadiativeBalance {
  waterTableDepthCm: number;
  co2EmissionsTco2ePerHaYr: number;
  ch4EmissionsTco2ePerHaYr: number;
  netRadiativeForcingTco2ePerHaYr: number;
  optimalWaterTableMaintained: boolean;
}

export function modelPeatlandRadiativeBalance(
  waterTableDepthBelowSurfaceCm: number, // e.g. 5cm to 60cm
  soilTempCelsius: number = 20.0
): PeatlandRadiativeBalance {
  // Optimal peatland water table depth is ~10-20 cm below surface.
  // Deeper water tables (>30 cm) expose peat to aerobic microbial decomposition -> massive CO2 release.
  // Flooded peat (<5 cm) promotes anaerobic methanogenesis -> high CH4 release (GWP20 = 84).
  const tempMultiplier = Math.pow(1.08, soilTempCelsius - 15.0);

  let co2Tonnes = 0.0;
  let ch4Tonnes = 0.0;

  if (waterTableDepthBelowSurfaceCm > 20.0) {
    // Aerobic zone expands: ~0.9 t CO2 / ha / yr per cm of drainage
    const excessDrainageCm = waterTableDepthBelowSurfaceCm - 20.0;
    co2Tonnes = excessDrainageCm * 0.90 * tempMultiplier;
    ch4Tonnes = 0.20 * tempMultiplier; // Minimal CH4 in dry peat
  } else if (waterTableDepthBelowSurfaceCm < 10.0) {
    // Waterlogged zone: Low CO2, High CH4
    const excessFloodingCm = 10.0 - waterTableDepthBelowSurfaceCm;
    co2Tonnes = 0.50 * tempMultiplier;
    // CH4 emission in kg, converted to tCO2e (* 84 / 1000)
    const ch4Kg = (20.0 + excessFloodingCm * 8.0) * tempMultiplier;
    ch4Tonnes = (ch4Kg * 84.0) / 1000.0;
  } else {
    // Sweet spot (10-20 cm): balanced minimal net emissions
    co2Tonnes = 1.20 * tempMultiplier;
    ch4Tonnes = 0.80 * tempMultiplier;
  }

  const netCo2e = Number((co2Tonnes + ch4Tonnes).toFixed(2));
  const optimal = waterTableDepthBelowSurfaceCm >= 10.0 && waterTableDepthBelowSurfaceCm <= 20.0;

  return {
    waterTableDepthCm: waterTableDepthBelowSurfaceCm,
    co2EmissionsTco2ePerHaYr: Number(co2Tonnes.toFixed(2)),
    ch4EmissionsTco2ePerHaYr: Number(ch4Tonnes.toFixed(2)),
    netRadiativeForcingTco2ePerHaYr: netCo2e,
    optimalWaterTableMaintained: optimal,
  };
}
