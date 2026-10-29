export interface MangroveSequestrationMetrics {
  annualSoilAccretionTco2ePerHectare: number;
  belowGroundBiomassTco2ePerHectare: number;
  totalCarbonStockTco2ePerHectare: number;
  accretionPermanenceVerified: boolean;
}

export function calculateMangroveBlueCarbonStock(
  areaHectares: number,
  sedimentAccretionRateMmPerYear: number, // typical 1.5 - 4.5 mm/yr
  dryBulkDensityGPerCm3: number = 0.45,   // typical 0.3 - 0.7 g/cm3
  organicCarbonFraction: number = 0.10,    // typical 8 - 14%
  belowGroundRootBiomassTonnesPerHa: number = 120.0
): MangroveSequestrationMetrics {
  if (areaHectares <= 0 || sedimentAccretionRateMmPerYear <= 0) {
    return {
      annualSoilAccretionTco2ePerHectare: 0,
      belowGroundBiomassTco2ePerHectare: 0,
      totalCarbonStockTco2ePerHectare: 0,
      accretionPermanenceVerified: false,
    };
  }

  // 1 hectare = 10,000 m2. Accretion thickness in meters = SAR / 1000.
  // Soil volume per ha per yr = 10,000 * (SAR / 1000) = 10 * SAR m3/ha/yr.
  // Soil mass = volume * density (g/cm3 = 1000 kg/m3).
  // Soil mass tonnes = 10 * SAR * dryBulkDensity.
  const soilMassTonnesPerHa = 10.0 * sedimentAccretionRateMmPerYear * dryBulkDensityGPerCm3;
  const organicCarbonTonnesPerHa = soilMassTonnesPerHa * organicCarbonFraction;
  // Convert C to CO2e (* 44/12)
  const annualSoilCo2ePerHa = Number((organicCarbonTonnesPerHa * (44.0 / 12.0)).toFixed(2));

  // Below-ground root biomass is ~45% carbon
  const rootCarbonTonnesPerHa = belowGroundRootBiomassTonnesPerHa * 0.45;
  const rootCo2ePerHa = Number((rootCarbonTonnesPerHa * (44.0 / 12.0)).toFixed(2));

  const totalStockPerHa = Number((annualSoilCo2ePerHa * 20.0 + rootCo2ePerHa).toFixed(2)); // 20-yr horizon stock
  const permanenceVerified = sedimentAccretionRateMmPerYear >= 1.0;

  return {
    annualSoilAccretionTco2ePerHectare: annualSoilCo2ePerHa,
    belowGroundBiomassTco2ePerHectare: rootCo2ePerHa,
    totalCarbonStockTco2ePerHectare: totalStockPerHa,
    accretionPermanenceVerified: permanenceVerified,
  };
}
