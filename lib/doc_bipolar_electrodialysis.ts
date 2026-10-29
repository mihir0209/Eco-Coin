export interface DocElectrodialysisResult {
  extractedCo2KgPerHour: number;
  specificEnergyKwhPerTonCo2: number;
  effluentAcidicPh: number;
  bipolarMembraneEfficiencyPct: number;
}

export function modelDirectOceanCaptureBipolar(
  seawaterFlowRateM3PerHour: number, // e.g. 1000 m3/h
  appliedCurrentAmps: number,
  cellVoltageVolts: number = 1.6,
  inletDissolvedInorganicCarbonMmolPerL: number = 2.1 // typical ~2.1 mM DIC
): DocElectrodialysisResult {
  if (seawaterFlowRateM3PerHour <= 0 || appliedCurrentAmps <= 0) {
    return { extractedCo2KgPerHour: 0, specificEnergyKwhPerTonCo2: 0, effluentAcidicPh: 8.1, bipolarMembraneEfficiencyPct: 0 };
  }

  // Bipolar membrane water splitting: H2O -> H+ + OH-
  // H+ protonates HCO3- to H2CO3 -> CO2(g) + H2O
  // Faraday constant = 96485 C/mol
  const molesProtonsPerSec = appliedCurrentAmps / 96485.0;
  const molesProtonsPerHour = molesProtonsPerSec * 3600.0;

  // Total DIC available in moles/hour
  const totalDicMolesPerHour = seawaterFlowRateM3PerHour * 1000.0 * (inletDissolvedInorganicCarbonMmolPerL / 1000.0);
  const co2ExtractedMoles = Math.min(totalDicMolesPerHour * 0.90, molesProtonsPerHour * 0.85);

  const extractedCo2Kg = (co2ExtractedMoles * 44.01) / 1000.0;
  const electricPowerKw = (appliedCurrentAmps * cellVoltageVolts) / 1000.0;

  // Specific energy = kWh / ton CO2
  const energyKwhPerTon = extractedCo2Kg > 0 ? (electricPowerKw / (extractedCo2Kg / 1000.0)) : 9999.0;
  const effPh = Math.max(3.8, Number((8.1 - Math.log10(1.0 + (molesProtonsPerHour / Math.max(1.0, totalDicMolesPerHour)) * 1000.0)).toFixed(2)));

  return {
    extractedCo2KgPerHour: Number(extractedCo2Kg.toFixed(2)),
    specificEnergyKwhPerTonCo2: Number(energyKwhPerTon.toFixed(1)),
    effluentAcidicPh: effPh,
    bipolarMembraneEfficiencyPct: 85.0,
  };
}
