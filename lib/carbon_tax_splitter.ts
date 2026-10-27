import crypto from "crypto";
import CarbonTaxSplitter, { ICarbonTaxSplitter, IVendorSplit } from "../models/CarbonTaxSplitter";

export interface SplitterInput {
  agreementId: string;
  payerEntity: string;
  totalGrossTokens: number;
  cbamTaxRate: number; // e.g. 0.05 for 5% statutory CBAM
  vendorSplits: IVendorSplit[];
  settlementNonce: string;
}

export interface SplitCalculationResult {
  totalGrossTokens: number;
  cbamTaxWithheld: number;
  totalVendorWithholding: number;
  totalTaxWithheld: number;
  totalNetDisbursed: number;
  calculatedSplits: IVendorSplit[];
}

/**
 * Pure calculation engine for CBAM carbon border tax and Scope-3 vendor allocations.
 */
export function calculateCarbonTaxSplits(input: SplitterInput): SplitCalculationResult {
  const { totalGrossTokens, cbamTaxRate, vendorSplits } = input;

  if (typeof totalGrossTokens !== "number" || totalGrossTokens <= 0 || !Number.isFinite(totalGrossTokens)) {
    throw new Error("Total gross tokens must be a positive finite number");
  }

  if (typeof cbamTaxRate !== "number" || cbamTaxRate < 0 || cbamTaxRate > 1.0) {
    throw new Error("CBAM tax rate must be between 0.0 and 1.0 (0% - 100%)");
  }

  if (!vendorSplits || vendorSplits.length === 0) {
    throw new Error("At least one vendor split must be defined");
  }

  // Validate percentages
  const totalPercentage = vendorSplits.reduce((acc, s) => acc + s.splitPercentage, 0.0);
  if (Math.abs(totalPercentage - 100.0) > 0.001) {
    throw new Error(`Vendor split percentages must sum exactly to 100%, got ${totalPercentage.toFixed(3)}%`);
  }

  // 1. Calculate Statutory CBAM Base Deduction
  const cbamTaxWithheld = Number((totalGrossTokens * cbamTaxRate).toFixed(4));
  const distributablePool = totalGrossTokens - cbamTaxWithheld;

  let totalVendorWithholding = 0.0;
  let totalNetDisbursed = 0.0;

  const calculatedSplits: IVendorSplit[] = vendorSplits.map((split) => {
    if (split.withholdingTaxRate < 0.0 || split.withholdingTaxRate > 1.0) {
      throw new Error(`Invalid withholding tax rate for vendor ${split.vendorId}: must be 0.0 - 1.0`);
    }

    const grossVendorShare = distributablePool * (split.splitPercentage / 100.0);
    const vendorTax = Number((grossVendorShare * split.withholdingTaxRate).toFixed(4));
    const netVendorShare = Number((grossVendorShare - vendorTax).toFixed(4));

    totalVendorWithholding += vendorTax;
    totalNetDisbursed += netVendorShare;

    return {
      vendorId: split.vendorId,
      vendorName: split.vendorName,
      splitPercentage: split.splitPercentage,
      withholdingTaxRate: split.withholdingTaxRate,
      allocatedNetTokens: netVendorShare,
      withheldTaxTokens: vendorTax,
    };
  });

  const totalTaxWithheld = Number((cbamTaxWithheld + totalVendorWithholding).toFixed(4));

  return {
    totalGrossTokens,
    cbamTaxWithheld,
    totalVendorWithholding: Number(totalVendorWithholding.toFixed(4)),
    totalTaxWithheld,
    totalNetDisbursed: Number(totalNetDisbursed.toFixed(4)),
    calculatedSplits,
  };
}

/**
 * Execute and record statutory settlement ledgering.
 */
export async function executeCarbonTaxSettlement(input: SplitterInput): Promise<ICarbonTaxSplitter> {
  const calc = calculateCarbonTaxSplits(input);

  const existing = await CarbonTaxSplitter.findOne({
    $or: [{ agreementId: input.agreementId }, { settlementNonce: input.settlementNonce }],
  });

  if (existing) {
    throw new Error(`Settlement agreement ${input.agreementId} or nonce ${input.settlementNonce} already exists`);
  }

  const record = await CarbonTaxSplitter.create({
    agreementId: input.agreementId,
    payerEntity: input.payerEntity,
    totalGrossTokens: input.totalGrossTokens,
    cbamTaxRate: input.cbamTaxRate,
    totalTaxWithheld: calc.totalTaxWithheld,
    totalNetDisbursed: calc.totalNetDisbursed,
    vendorSplits: calc.calculatedSplits,
    status: "EXECUTED",
    settlementNonce: input.settlementNonce,
    executedAt: new Date(),
  });

  return record;
}
