export function calculateCbamTariff(
  embeddedEmissionsTCO2e: number,
  euBenchmarkPricePerTon: number,
  originTaxPaidPerTon: number = 0
): { grossLiability: number; originCredit: number; netPayable: number } {
  if (embeddedEmissionsTCO2e < 0 || euBenchmarkPricePerTon < 0) {
    throw new Error("Invalid CBAM calculation parameters");
  }

  const grossLiability = Number((embeddedEmissionsTCO2e * euBenchmarkPricePerTon).toFixed(2));
  const originCredit = Number((embeddedEmissionsTCO2e * originTaxPaidPerTon).toFixed(2));
  const netPayable = Math.max(0, Number((grossLiability - originCredit).toFixed(2)));

  return { grossLiability, originCredit, netPayable };
}
