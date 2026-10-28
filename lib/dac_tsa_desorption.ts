export function modelDacTsaDesorption(
  sorbentMassKg: number,
  desorptionTempCelsius: number,
  steamEnthalpyKjKg: number = 2257.0, // Latent heat of steam
  co2LoadingCapacityPct: number = 8.0 // 8 wt% loading
): { co2ReleasedKg: number; thermalEnergyRequiredKwh: number; thermalIntensityGjPerTon: number } {
  if (sorbentMassKg <= 0 || desorptionTempCelsius < 90.0) {
    return { co2ReleasedKg: 0, thermalEnergyRequiredKwh: 0, thermalIntensityGjPerTon: 0 };
  }
  const co2ReleasedKg = Number((sorbentMassKg * (co2LoadingCapacityPct / 100.0)).toFixed(2));
  // Sensible heat + desorption enthalpy (~60 kJ/mol CO2 = ~1363 kJ/kg CO2)
  const heatDesorptionKj = co2ReleasedKg * 1363.0;
  const sensibleHeatKj = sorbentMassKg * 1.2 * (desorptionTempCelsius - 25.0); // Cp ~ 1.2 kJ/kg*K
  const totalHeatKj = heatDesorptionKj + sensibleHeatKj;

  const thermalEnergyRequiredKwh = Number((totalHeatKj / 3600.0).toFixed(2));
  const thermalIntensityGjPerTon = Number(((totalHeatKj / (co2ReleasedKg / 1000.0)) / 1_000_000.0).toFixed(2));

  return { co2ReleasedKg, thermalEnergyRequiredKwh, thermalIntensityGjPerTon };
}
