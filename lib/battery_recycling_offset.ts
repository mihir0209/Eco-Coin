export function calculateBatteryRecyclingOffset(
  batteryPackWeightKg: number,
  lithiumContentKg: number,
  nickelContentKg: number,
  cobaltContentKg: number,
  recoveryEfficiencyPct: number = 95.0
): { recoveredLithiumKg: number; recoveredNickelKg: number; recoveredCobaltKg: number; avoidedCo2Kg: number } {
  if (batteryPackWeightKg <= 0 || recoveryEfficiencyPct <= 0) {
    return { recoveredLithiumKg: 0, recoveredNickelKg: 0, recoveredCobaltKg: 0, avoidedCo2Kg: 0 };
  }
  const eff = recoveryEfficiencyPct / 100.0;
  const recoveredLithiumKg = Number((lithiumContentKg * eff).toFixed(2));
  const recoveredNickelKg = Number((nickelContentKg * eff).toFixed(2));
  const recoveredCobaltKg = Number((cobaltContentKg * eff).toFixed(2));

  // Avoided emissions per kg virgin material: Lithium ~15 kg CO2/kg, Nickel ~18 kg CO2/kg, Cobalt ~25 kg CO2/kg
  const avoidedCo2Kg = Number(
    (recoveredLithiumKg * 15.0 + recoveredNickelKg * 18.0 + recoveredCobaltKg * 25.0).toFixed(2)
  );

  return { recoveredLithiumKg, recoveredNickelKg, recoveredCobaltKg, avoidedCo2Kg };
}
