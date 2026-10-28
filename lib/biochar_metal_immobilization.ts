export function calculateBiocharMetalSorption(
  biocharTonsApplied: number,
  soilLeadPpm: number,
  soilCadmiumPpm: number,
  biocharPh: number = 8.5
): { immobilizedLeadKg: number; immobilizedCadmiumKg: number; soilToxicityReductionPct: number } {
  if (biocharTonsApplied <= 0 || (soilLeadPpm <= 0 && soilCadmiumPpm <= 0)) {
    return { immobilizedLeadKg: 0, immobilizedCadmiumKg: 0, soilToxicityReductionPct: 0 };
  }
  // High pH biochar increases negative surface charge & cation exchange capacity (CEC)
  const phMultiplier = Math.max(0.5, Math.min(1.5, (biocharPh - 6.0) * 0.4));
  // Capacity: ~15 kg Pb / ton biochar, ~4 kg Cd / ton biochar
  const capacityPb = biocharTonsApplied * 15.0 * phMultiplier;
  const capacityCd = biocharTonsApplied * 4.0 * phMultiplier;

  // 1 hectare topsoil (20 cm) ~ 2,500 tons. PPM * 2.5 = total kg in soil
  const totalPbKg = soilLeadPpm * 2.5;
  const totalCdKg = soilCadmiumPpm * 2.5;

  const immobilizedLeadKg = Number(Math.min(totalPbKg, capacityPb).toFixed(2));
  const immobilizedCadmiumKg = Number(Math.min(totalCdKg, capacityCd).toFixed(2));

  const totalMetals = totalPbKg + totalCdKg;
  const totalImmobilized = immobilizedLeadKg + immobilizedCadmiumKg;
  const soilToxicityReductionPct = totalMetals > 0 ? Number(((totalImmobilized / totalMetals) * 100.0).toFixed(1)) : 0;

  return { immobilizedLeadKg, immobilizedCadmiumKg, soilToxicityReductionPct };
}
