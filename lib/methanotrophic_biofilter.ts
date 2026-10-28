export interface MethanotrophicOxidationResult {
  inletCh4GramsPerM3: number;
  outletCh4GramsPerM3: number;
  oxidationEfficiencyPct: number;
  co2eGwpReducedKgPerHour: number;
}

export function modelMethanotrophicBiofilter(
  airFlowRateM3PerHour: number,
  inletCh4Ppm: number, // e.g. 500 ppm
  biofilterBedTempC: number = 22.0,
  biofilterMoisturePct: number = 55.0
): MethanotrophicOxidationResult {
  if (airFlowRateM3PerHour <= 0 || inletCh4Ppm <= 0) {
    return { inletCh4GramsPerM3: 0, outletCh4GramsPerM3: 0, oxidationEfficiencyPct: 0, co2eGwpReducedKgPerHour: 0 };
  }

  // Optimal methanotrophic bacterial activity occurs at 18-30C and 45-65% moisture
  const tempFactor = (biofilterBedTempC >= 15 && biofilterBedTempC <= 35) ? 0.95 : 0.40;
  const moistureFactor = (biofilterMoisturePct >= 40 && biofilterMoisturePct <= 70) ? 1.0 : 0.50;
  const efficiency = Math.min(0.98, 0.90 * tempFactor * moistureFactor);

  // CH4 gas density ~0.668 kg/m3 at standard temp; 1 ppm CH4 ~ 0.000668 g/m3
  const inletGramsPerM3 = inletCh4Ppm * 0.000668;
  const outletGramsPerM3 = inletGramsPerM3 * (1.0 - efficiency);

  const totalCh4OxidizedKgPerHour = (airFlowRateM3PerHour * (inletGramsPerM3 - outletGramsPerM3)) / 1000.0;
  // Stoichiometry: CH4 + 2O2 -> CO2 + 2H2O
  // 1 kg CH4 has GWP 84 (20-yr horizon). Oxidation yields 2.75 kg CO2 (GWP 1).
  // Net GWP reduction = 84 - 2.75 = 81.25 kg CO2e per kg CH4 oxidized
  const netGwpReductionKg = Number((totalCh4OxidizedKgPerHour * 81.25).toFixed(2));

  return {
    inletCh4GramsPerM3: Number(inletGramsPerM3.toFixed(4)),
    outletCh4GramsPerM3: Number(outletGramsPerM3.toFixed(4)),
    oxidationEfficiencyPct: Number((efficiency * 100.0).toFixed(1)),
    co2eGwpReducedKgPerHour: netGwpReductionKg,
  };
}
