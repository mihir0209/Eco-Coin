export function calculateMethaneDigesterAbatement(
  biogasM3PerDay: number,
  ch4ContentPct: number,
  daysActive: number,
  flareEfficiencyPct: number = 99.0
): number {
  if (biogasM3PerDay <= 0 || ch4ContentPct <= 0 || daysActive <= 0) return 0;
  // 1 m3 of CH4 is approx 0.717 kg
  const ch4M3 = biogasM3PerDay * (ch4ContentPct / 100) * daysActive;
  const ch4Kg = ch4M3 * 0.717 * (flareEfficiencyPct / 100);
  // GWP of methane = 28
  return Number(((ch4Kg * 28) / 1000.0).toFixed(2));
}
