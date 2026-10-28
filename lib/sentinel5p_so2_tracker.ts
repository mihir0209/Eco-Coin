export function evaluateMaritimePlumeEmissions(
  so2ColumnDensityMolM2: number,
  no2ColumnDensityMolM2: number,
  vesselSpeedKnots: number
): { isSulfurCapExceeded: boolean; estimatedFuelSulfurPct: number; compliancePenaltyTco2e: number } {
  if (so2ColumnDensityMolM2 <= 0 || vesselSpeedKnots <= 0) {
    return { isSulfurCapExceeded: false, estimatedFuelSulfurPct: 0.0, compliancePenaltyTco2e: 0 };
  }
  // IMO 2020 Global Sulfur Cap: max 0.50% sulfur in marine fuel (0.10% in ECA zones)
  const so2ToNo2Ratio = so2ColumnDensityMolM2 / Math.max(0.0001, no2ColumnDensityMolM2);
  const estimatedFuelSulfurPct = Number((so2ToNo2Ratio * 0.45).toFixed(3));
  const isSulfurCapExceeded = estimatedFuelSulfurPct > 0.50;
  const compliancePenaltyTco2e = isSulfurCapExceeded ? Number(((estimatedFuelSulfurPct - 0.50) * vesselSpeedKnots * 25.0).toFixed(2)) : 0;

  return { isSulfurCapExceeded, estimatedFuelSulfurPct, compliancePenaltyTco2e };
}
