export interface BiomethaneYieldMetrics {
  biomethaneGeneratedM3PerDay: number;
  co2CapturedBiogasM3PerDay: number;
  biomethaneMethaneContentPct: number;
  netRenewableEnergyMwhPerDay: number;
}

export function modelMacroalgaeBiomethaneDigestion(
  wetAlgaeTonnesPerDay: number,
  volatileSolidsFraction: number = 0.65, // 65% VS on dry basis
  dryMatterContentPct: number = 15.0,   // 15% dry matter in fresh kelp
  biomethanePotentialM3PerKgVs: number = 0.32
): BiomethaneYieldMetrics {
  if (wetAlgaeTonnesPerDay <= 0) {
    return { biomethaneGeneratedM3PerDay: 0, co2CapturedBiogasM3PerDay: 0, biomethaneMethaneContentPct: 0, netRenewableEnergyMwhPerDay: 0 };
  }

  // Dry matter in kg/day = wet_tonnes * 1000 * (dry% / 100)
  const dryMatterKg = wetAlgaeTonnesPerDay * 1000.0 * (dryMatterContentPct / 100.0);
  const volatileSolidsKg = dryMatterKg * volatileSolidsFraction;

  // Methane volume = VS * BMP
  const ch4M3 = volatileSolidsKg * biomethanePotentialM3PerKgVs;
  // Biogas is typically 60% CH4 and 40% CO2
  const co2M3 = ch4M3 * (40.0 / 60.0);

  // Lower heating value of methane ~9.97 kWh / m3 = 0.00997 MWh / m3
  const energyMwh = Number(((ch4M3 * 0.00997)).toFixed(2));

  return {
    biomethaneGeneratedM3PerDay: Number(ch4M3.toFixed(1)),
    co2CapturedBiogasM3PerDay: Number(co2M3.toFixed(1)),
    biomethaneMethaneContentPct: 60.0,
    netRenewableEnergyMwhPerDay: energyMwh,
  };
}
