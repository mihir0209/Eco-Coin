export function calculateStakingYield(amount: number, lockDays: number): number {
  const baseRate = 0.05;
  const durationMultiplier = Math.min(2.0, 1.0 + (lockDays / 365));
  return Number((amount * baseRate * durationMultiplier).toFixed(2));
}

export function generateRetirementNftMetadata(certId: string, beneficiary: string, tco2e: number) {
  return { certId, beneficiary, tco2e, timestamp: Date.now(), standard: "ERC-721-CARBON-RETIREMENT" };
}

export function calculateBiocharPermanence(feedstockTons: number, pyrolysisTempC: number): number {
  if (pyrolysisTempC < 400) throw new Error("Pyrolysis temperature too low for biochar stability");
  const conversionFactor = 0.75;
  return Number((feedstockTons * conversionFactor).toFixed(2));
}

export function evaluateCanopyDensity(treeCount: number, areaHectares: number): { treesPerHectare: number; rating: string } {
  const density = treeCount / Math.max(0.1, areaHectares);
  const rating = density >= 1000 ? "OPTIMAL_AFFORESTATION" : (density >= 500 ? "MODERATE" : "SPARSE");
  return { treesPerHectare: Number(density.toFixed(1)), rating };
}

export function calculateWetlandsMethaneOffset(hectares: number, baselineFlux: number, managedFlux: number): number {
  const fluxDiff = Math.max(0, baselineFlux - managedFlux);
  return Number((hectares * fluxDiff * 28).toFixed(2)); // CH4 GWP = 28
}

export function calculateSoilOrganicCarbon(depthCm: number, bulkDensity: number, socPct: number, hectares: number): number {
  // SOC stock = depth * bulk_density * %C * 100
  const stockPerHa = depthCm * bulkDensity * (socPct / 100) * 100;
  return Number((stockPerHa * hectares).toFixed(2));
}

export function calculateDacCarbonNet(kwhConsumed: number, gridEmissionFactorKgKwh: number, grossCapturedTons: number): number {
  const grossEmissionsTons = (kwhConsumed * gridEmissionFactorKgKwh) / 1000.0;
  return Number(Math.max(0, grossCapturedTons - grossEmissionsTons).toFixed(2));
}

export function calculateOceanAlkalinityUptake(olivineDissolvedTons: number): number {
  // 1 ton of olivine absorbs ~0.8 ton of CO2 via bicarbonate conversion
  return Number((olivineDissolvedTons * 0.8).toFixed(2));
}

export function calculateBasaltMineralization(crushedBasaltTons: number, rainfallMmPerYear: number): number {
  const weatherRate = rainfallMmPerYear >= 1000 ? 0.3 : 0.15;
  return Number((crushedBasaltTons * weatherRate).toFixed(2));
}

export function calculateMangroveBlueCarbon(hectares: number, ageYears: number): number {
  const rate = Math.min(15.0, 5.0 + ageYears * 0.5); // tCO2e/ha/yr
  return Number((hectares * rate).toFixed(2));
}
