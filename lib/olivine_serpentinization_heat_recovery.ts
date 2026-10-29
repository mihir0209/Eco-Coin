export interface SerpentinizationEnergyMetrics {
  reactionExothermicHeatKw: number;
  thermoelectricPowerGeneratedKw: number;
  hotFluidTempCelsius: number;
  annualElectricityMwh: number;
}

export function modelSerpentinizationThermoelectric(
  olivineReactionRateKgPerHour: number,
  coolingWaterFlowRateLpm: number = 50.0,
  ambientTempC: number = 20.0
): SerpentinizationEnergyMetrics {
  if (olivineReactionRateKgPerHour <= 0) {
    return { reactionExothermicHeatKw: 0, thermoelectricPowerGeneratedKw: 0, hotFluidTempCelsius: ambientTempC, annualElectricityMwh: 0 };
  }

  // Serpentinization reaction: Mg2SiO4 + CO2 + H2O -> Mg3Si2O5(OH)4 + MgCO3
  // Exothermic enthalpy Delta H ~ 250 kJ / mol olivine (~1.78 MJ / kg olivine)
  const heatEnergyKjPerHour = olivineReactionRateKgPerHour * 1780.0;
  const heatPowerKw = Number((heatEnergyKjPerHour / 3600.0).toFixed(2));

  // Fluid temperature rise: Q = m * Cp * deltaT
  const waterKgPerHour = coolingWaterFlowRateLpm * 60.0;
  const deltaT = (heatEnergyKjPerHour / (waterKgPerHour * 4.184));
  const hotTemp = Number((ambientTempC + Math.min(180.0, deltaT)).toFixed(1));

  // Thermoelectric generator (TEG) efficiency ~5-8% across hot/cold gradient
  const carnotEff = (hotTemp - ambientTempC) / (hotTemp + 273.15);
  const tegEff = carnotEff * 0.18; // Figure of merit ZT ~ 1.0 factor
  const electricKw = Number((heatPowerKw * tegEff).toFixed(2));
  const annualMwh = Number(((electricKw * 8760.0) / 1000.0).toFixed(2));

  return {
    reactionExothermicHeatKw: heatPowerKw,
    thermoelectricPowerGeneratedKw: electricKw,
    hotFluidTempCelsius: hotTemp,
    annualElectricityMwh: annualMwh,
  };
}
