export interface SoilMicrobialCarbonMetrics {
  fumigatedExtractCarbonMgKg: number;
  nonFumigatedExtractCarbonMgKg: number;
  microbialBiomassCarbonMgKg: number;
  microbialQuotientPct: number;
}

export function traceSoilMicrobialBiomassCarbon(
  fumigatedExtractCarbonMgKg: number,
  nonFumigatedExtractCarbonMgKg: number,
  totalOrganicCarbonGramsPerKg: number = 25.0, // 2.5% TOC
  kecExtractionFactor: number = 0.45           // Standard Vance et al. 1987 conversion factor
): SoilMicrobialCarbonMetrics {
  const extractableCarbonDiff = Math.max(0, fumigatedExtractCarbonMgKg - nonFumigatedExtractCarbonMgKg);
  // MBC = Ec / k_EC
  const mbc = Number((extractableCarbonDiff / kecExtractionFactor).toFixed(2));

  // Microbial quotient qMic = (MBC / Total Organic Carbon) * 100%
  // TOC in mg/kg = g/kg * 1000
  const tocMgKg = totalOrganicCarbonGramsPerKg * 1000.0;
  const qMic = Number(((mbc / Math.max(1.0, tocMgKg)) * 100.0).toFixed(2));

  return {
    fumigatedExtractCarbonMgKg,
    nonFumigatedExtractCarbonMgKg,
    microbialBiomassCarbonMgKg: mbc,
    microbialQuotientPct: qMic,
  };
}
